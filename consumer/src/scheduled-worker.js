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

const FETCH_LIMIT = 10;

let connection;
process.once('SIGINT', () => {
  debug('Received SIGINT...closing connection...')
  try {
    connection.close();
  } catch (ignore) { // eslint-ignore-line
    logger.logFullError(ignore)
  }
  process.exit();
});

let EVENT_HANDLERS = {
  [EVENT.ROUTING_KEY.PROJECT_DRAFT_CREATED]: ConsumerService.processProjectCreated,
  [EVENT.ROUTING_KEY.PROJECT_UPDATED]: ConsumerService.processProjectUpdated
}

function close() {
  console.log('closing self after processing messages...')
  try {
    setTimeout(connection.close.bind(connection), 30000);
  } catch (ignore) { // eslint-ignore-line
    logger.logFullError(ignore)
  }
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
      return;
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
        reject(new Error(`Unknown message type: ${key}`));
        return;
      }
      data = JSON.parse(msg.content.toString());
    } catch (ignore) {
      logger.info(ignore);
      logger.error('Invalid message. Ignoring');
      resolve('Invalid message. Ignoring');
      return;
    }
    return handler(logger, data).then(() => {
      resolve(msg);
      return;
    })
    .catch((e) => {
      // logger.logFullError(e, `Error processing message`);
      if (e.shouldAck) {
        debug("Resolving for Unprocessable Error in handler...");
        resolve(msg);
      } else {
        debug("Rejecting promise for error in msg processing...")
        reject(new Error('Error processing message'));
      }
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
export async function start() {
  try {
    console.log("Scheduled Worker Connecting to RabbitMQ: " + config.rabbitmqURL.substr(-5));
    connection = await amqp.connect(config.rabbitmqURL);
    connection.on('error', (e) => {
      logger.logFullError(e, `ERROR IN CONNECTION`);
    })
    connection.on('close', () => {
      debug('Before closing connection...')
    })
    debug('created connection successfully with URL: ' + config.rabbitmqURL);
    const connect2sfChannel = await connection.createConfirmChannel();
    debug('Channel created for consuming failed messages ...');
    connect2sfChannel.prefetch(FETCH_LIMIT);
    assertExchangeQueues(
      connect2sfChannel,
      config.rabbitmq.connect2sfExchange,
      config.rabbitmq.queues.connect2sf
    ).then(() => {
      debug('Asserted all required exchanges and queues');
      let counter = 0;
      _.range(1, 11).forEach(() => {
        return connect2sfChannel.get(config.rabbitmq.queues.connect2sf).
        then((msg) => {
          if (msg) {
            return processMessage(
              connect2sfChannel,
              msg
            ).then((responses) => {
              counter++;
              debug('Processed message');
              connect2sfChannel.ack(msg);
              if (counter >= FETCH_LIMIT) {
                close();
              }
            }).catch((e) => {
              counter++;
              debug('Processed message with Error');
              connect2sfChannel.nack(msg);
              logger.logFullError(e, `Unable to process one of the messages`);
              if (counter >= FETCH_LIMIT) {
                close();
              }
            })
          } else {
            counter++;
            debug('Processed Empty message');
            if (counter >= FETCH_LIMIT) {
              close();
            }
          }
        }).catch(() => {
          console.log('get failed to consume')
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
