/**
 * The main app entry
 */

import config from 'config';
import amqp from 'amqplib';
import logger from './common/logger';
import ConsumerService from './services/ConsumerService';

const debug = require('debug')('app:worker');

let connection;
process.once('SIGINT', () => {
  try {
    connection.close();
  } catch (ignore) { // eslint-ignore-line
  }
  process.exit();
});

/**
 * Consume messages from the queue
 * @param {Object} channel the target channel
 * @param {String} queue the queue name
 * @param {Function} fn the function handler
 */
export function consume(channel, queue, routingKey, fn) {
  channel.assertQueue(queue, { durable: true });
  channel.consume(queue, async (msg) => {
    if (!msg) {
      return;
    }
    debug(`Consuming message in ${queue}\n${msg.content}`);
    debug(msg);
    let project;
    try {
      project = JSON.parse(msg.content.toString());
    } catch (ignore) {
      logger.info(ignore);
      logger.error('Invalid message. Ignoring');
      channel.ack(msg);
      return;
    }
    try {
      if(routingKey == msg.routingKey) {
        await fn(project);
        channel.ack(msg);
      }
    } catch (e) {
      logger.logFullError(e, `Queue ${queue}`);
      if (e.shouldAck) {
        channel.ack(msg);
      } else {
        channel.nack(msg);
      }
    }
  });
}

/**
 * Start the worker
 */
async function start() {
  connection = await amqp.connect(config.rabbitmqURL);
  const channel = await connection.createConfirmChannel();
  consume(channel, config.queues.projectCreatedQueue, config.queues.projectCreatedRoutingKey, ConsumerService.processProjectCreated);
  consume(channel, config.queues.projectLaunchedQueue, config.queues.projectLaunchedRoutingKey, ConsumerService.processProjectUpdated);
}

if (!module.parent) {
  start();
}
