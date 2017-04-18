/**
 * The main app entry
 */

import config from 'config';
import amqp from 'amqplib';
import _ from 'lodash';
import logger from './common/logger';
import ConsumerService from './services/ConsumerService';
import { EVENT } from '../config/constants';

const debug = require('debug')('app:worker');

let connection;
process.once('SIGINT', () => {
  try {
    connection.close();
  } catch (ignore) { // eslint-ignore-line
  }
  process.exit();
});

let EVENT_HANDLERS = {
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: ConsumerService.processProjectCreated
  // [EVENT.ROUTING_KEY.PROJECT_UPDATED]: ConsumerService.processProjectUpdated
}

export function initHandlers(handlers) {
  EVENT_HANDLERS = handlers;
}

/**
 * Consume messages from the queue
 * @param {Object} channel the target channel
 * @param {String} exchangeName the exchange name
 * @param {String} queue the queue name
 */
export async function consume(channel, exchangeName, queue, publishChannel) {
  channel.assertExchange(exchangeName, 'topic', { durable: true });
  publishChannel.assertExchange(exchangeName, 'topic', { durable: true });
  channel.assertQueue(queue, { durable: true });
  const bindings = _.keys(EVENT_HANDLERS);
  const bindingPromises = _.map(bindings, rk =>
    channel.bindQueue(queue, exchangeName, rk));
  return Promise.all(bindingPromises).then(() => {
    channel.consume(queue, async (msg) => {
      if (!msg) {
        return;
      }
      debug(`Consuming message in ${queue}\n${msg.content}`);
      const key = _.get(msg, 'fields.routingKey');
      debug('Received Message', key, msg.fields);

      let handler;
      let data;
      try {
        handler = EVENT_HANDLERS[key];
        if (!_.isFunction(handler)) {
          logger.error(`Unknown message type: ${key}, NACKing... `);
          channel.nack(msg, false, false)
        }
        data = JSON.parse(msg.content.toString());
      } catch (ignore) {
        logger.info(ignore);
        logger.error('Invalid message. Ignoring');
        channel.ack(msg);
        return;
      }
      try {
        await handler(logger, data);
        channel.ack(msg);
      } catch (e) {
        logger.logFullError(e, `Queue ${queue}`);
        if (e.shouldAck) {
          channel.ack(msg);
        } else {
          // ack the message but copy it to other queue where no consumer is listening
          // we can listen to that queue on adhoc basis when we see error case like lead not created in SF
          // we can use cloudamqp console to check the messages and may be manually create SF lead
          // nacking here was causing flood of messages to the worker and it keep on consuming high resources
          channel.ack(msg);
          try {
            publishChannel.publish(
              config.rabbitmq.connect2sfExchange,
              key + EVENT.ROUTING_KEY.FAILED_SUFFIX,
              new Buffer(msg.content.toString())
            );
          } catch(e) {
            // TODO decide if we want nack the original msg here
            // for now just ignoring the error in requeue
            logger.logFullError(e, `Error in publising Exchange to ${exchangeName}`);
          }
        }
      }
    });
  });
}

/**
 * Start the worker
 */
async function start() {
  try {
    console.log(config.rabbitmqURL);
    connection = await amqp.connect(config.rabbitmqURL);
    debug('created connection successfully with URL: ' + config.rabbitmqURL);
    const channel = await connection.createConfirmChannel();
    debug('Channel created for projects exchange ...');
    const publishChannel = await connection.createConfirmChannel();
    debug('Channel created for publishing failed messages ...');
    consume(
      channel,
      config.rabbitmq.projectsExchange,
      config.rabbitmq.queues.project,
      publishChannel
    );
    const connect2sfChannel = await connection.createConfirmChannel();
    debug('Channel created for consuming failed messages ...');
    consume(
      connect2sfChannel,
      config.rabbitmq.connect2sfExchange,
      config.rabbitmq.queues.connect2sf,
      publishChannel
    );
  } catch (e) {
    debug('Unable to connect to RabbitMQ');
  }
}

if (!module.parent) {
  start();
}
