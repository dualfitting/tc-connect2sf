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

const handlers = {
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: ConsumerService.processProjectCreated,
  [EVENT.ROUTING_KEY.PROJECT_UPDATED]: ConsumerService.processProjectUpdated
}

/**
 * Consume messages from the queue
 * @param {Object} channel the target channel
 * @param {String} exchangeName the exchange name
 * @param {String} queue the queue name
 */
export async function consume(channel, exchangeName, queue) {
  console.log(exchangeName)
  console.log(queue)
  channel.assertExchange(exchangeName, 'topic', { durable: true });
  // channel.assertQueue(queue, { durable: true })
  // .then((q) => console.log(q))
  // .catch((e) => console.log(e))
  channel.assertQueue(queue, { durable: true });
  const bindings = _.keys(handlers);
  debug('Adding bindings: ', bindings);
  console.log(bindings);
  const bindingPromises = _.map(bindings, rk =>
    channel.bindQueue(queue, exchangeName, rk));
  return Promise.all(bindingPromises).then(() => {
    channel.consume(queue, async (msg) => {
      if (!msg) {
        return;
      }
      debug(`Consuming message in ${queue}\n${msg.content}`);
      debug(`Original request Id = ${msg.properties.correlationId}`)
      // debug(msg);
      const key = msg.fields.routingKey;
      debug(key)
      // create a child logger so we can trace with original request id
      // const cLogger = logger.child({
      //   requestId: msg.properties.correlationId,
      // });
      // cLogger.debug('Received Message', key, msg.fields);
      debug('Received Message', key, msg.fields);

      let handler;
      let data;
      try {
        handler = handlers[key];
        console.log(handler);
        if (!_.isFunction(handler)) {
          logger.error(`Unknown message type: ${key}, NACKing... `);
          channel.nack(msg, false, false)
        }
        data = JSON.parse(msg.content.toString());
        console.log(data)
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
          channel.nack(msg);
        }
      }
    });
  });
}

/**
 * Start the worker
 */
async function start() {
  console.log(config.rabbitmqURL);
  connection = await amqp.connect(config.rabbitmqURL);
  console.log('created connection successfully with URL: ' + config.rabbitmqURL);
  const channel = await connection.createConfirmChannel();
  console.log('Channel confirmed...');
  consume(channel, config.rabbitmq.projectsExchange, config.rabbitmq.queues.project);
}

if (!module.parent) {
  start();
}
