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
  close();
});

let EVENT_HANDLERS = {
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: ConsumerService.processProjectCreated
  // [EVENT.ROUTING_KEY.PROJECT_UPDATED]: ConsumerService.processProjectUpdated
}

function close() {
  console.log('closing self...')
  try {
    connection.close();
  } catch (ignore) { // eslint-ignore-line
  }
  process.exit();
}

export function initHandlers(handlers) {
  EVENT_HANDLERS = handlers;
}

/**
 * Processes the given message and acks/nacks the channel
 * @param {Object} channel the target channel
 * @param {Object} msg the message to be processed
 */
export function processMessage(channel, msg) {
  return new Promise((resolve, reject) => {
    if (!msg) {
      reject(new Error('Empty message. Ignoring'));
    }
    debug(`Consuming message in \n${msg.content}`);
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
      reject(new Error('Invalid message. Ignoring'));
    }
    return handler(logger, data).then(() => {
      channel.ack(msg);
      resolve(msg);
    })
    .catch((e) => {
      logger.logFullError(e, `Error processing message`);
      if (e.shouldAck) {
        channel.ack(msg);
      } else {
        // NACK and requeue (nack requeues by default) the message for next turn
        channel.nack(msg);
      }
      reject(new Error('Error processing message'));
    });
  })
}

function assertExchangeQueues(channel, exchangeName, queue) {
  channel.assertExchange(exchangeName, 'topic', { durable: true });
  channel.assertQueue(queue, { durable: true });
  const bindings = _.keys(EVENT_HANDLERS);
  const bindingPromises = _.map(bindings, rk =>
    channel.bindQueue(queue, exchangeName, rk));
  debug('binding queue ' + queue + ' to exchange: ' + exchangeName);
  return Promise.all(bindingPromises);
}

/**
 * Start the worker
 */
async function start() {
  try {
    console.log(config.rabbitmqURL);
    connection = await amqp.connect(config.rabbitmqURL);
    debug('created connection successfully with URL: ' + config.rabbitmqURL);
    const connect2sfChannel = await connection.createConfirmChannel();
    debug('Channel created for consuming failed messages ...');
    assertExchangeQueues(
      connect2sfChannel,
      config.rabbitmq.connect2sfExchange,
      config.rabbitmq.queues.connect2sf
    ).then(() => {
      debug('Asserted all required exchanges and queues');
      let counter = 0;
      [1,2,3,4,5,6,7,8,9,10].forEach(() => {
        return connect2sfChannel.get(config.rabbitmq.queues.connect2sf).then((msg) => {
          if (msg) {
            processMessage(
              connect2sfChannel,
              msg
            ).then((responses) => {
              counter++;
              debug('Processed messages = ' + counter);
              if (counter >= 10) {
                close();
              }
            }).catch((e) => {
              counter++;
              debug('Processed messages[Error] = ' + counter);
              logger.logFullError(e, `Unable to process one of the messages`);
              if (counter >= 10) {
                close();
              }
            })
          }
        })
      })
    })
    
  } catch (e) {
    logger.logFullError(e, `Unable to connect to RabbitMQ`);
  }
}

if (!module.parent) {
  start();
}
