const { EventEmitter } = require('events');
const logger = require('../logger');

let publisher = null;
let subscriber = null;
let usingRedis = false;
const localBus = new EventEmitter();
localBus.setMaxListeners(0);

function init(redisUrl) {
  if (!redisUrl) {
    usingRedis = false;
    return;
  }
  try {
    const { createClient } = require('redis');
    publisher = createClient({ url: redisUrl });
    subscriber = publisher.duplicate();
    publisher.on('error', err => logger.warn({ err }, 'pubsub_publisher_error'));
    subscriber.on('error', err => logger.warn({ err }, 'pubsub_subscriber_error'));
    Promise.all([publisher.connect(), subscriber.connect()])
      .then(() => {
        usingRedis = true;
        logger.info('pubsub_connected_redis');
      })
      .catch(err => {
        usingRedis = false;
        logger.warn({ err }, 'pubsub_redis_connect_failed_falling_back_to_local');
      });
  } catch (e) {
    usingRedis = false;
    logger.warn({ err: e }, 'pubsub_redis_unavailable_falling_back_to_local');
  }
}

async function publish(channel, payload) {
  const message = JSON.stringify(payload);
  if (usingRedis && publisher && publisher.isOpen) {
    try {
      await publisher.publish(channel, message);
      return;
    } catch (e) {
      logger.warn({ err: e, channel }, 'pubsub_publish_failed_falling_back_to_local');
    }
  }
  localBus.emit(channel, payload);
}

function subscribe(channel, handler) {
  if (usingRedis && subscriber && subscriber.isOpen) {
    subscriber.subscribe(channel, message => {
      try {
        handler(JSON.parse(message));
      } catch (e) {
        logger.warn({ err: e, channel }, 'pubsub_message_parse_failed');
      }
    }).catch(err => logger.warn({ err, channel }, 'pubsub_subscribe_failed'));
  }
  // Always listen on the local bus too, so single-instance/dev deployments
  // (or Redis reconnect gaps) still deliver events published locally in this process.
  localBus.on(channel, handler);
  return () => localBus.off(channel, handler);
}

module.exports = { init, publish, subscribe };
