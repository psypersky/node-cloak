import redisPubSub from 'redis-pubsub-emitter';
import createError from 'http-errors';
import invariant from 'invariant';
import { isString } from 'lodash';
import ms from 'ms';

const debug = require('debug')('nc:pubsub');

const prototype = {

  _onMessageHandlers: [],

  // Broadcast message to the network
  send(event, data) {
    debug(`broadcasting ${event}`);
    const message = this.createMessage(data);
    this.publish(event, message);
  },

  // Send message to an specific addressee
  sendMessage(event, to, data) {
    debug(`sendMessage to ${to}`);
    const message = this.createMessage(data, to);
    this.publish(event, message);
  },

  // Append your identity to the message and the addressee if included
  createMessage(data, to) {
    const message = {
      hostId: this.client.id,
      data: data
    };

    if (to) {
      message.to = to;
    }

    return message;
  },

  // Register a function that is executed if is addressed to you and add it to _onMessageHandlers
  onMessage(event, fn) {
    debug(`register onMessage ${event} function:${!!fn}`);
    let wrappedFn = function(data) {
      if (data.to !== this.client.id) return;
      fn.apply(this, arguments);
    };
    wrappedFn = wrappedFn.bind(this);

    this._onMessageHandlers.push([event, fn, wrappedFn]);
    this.on(event, wrappedFn);
  },

  // Register a function that is executed only once if its addressed to you
  onceMessage(event, fn) {
    debug(`register onceMessage ${event} function:${!!fn}`);
    let wrappedFn = function(data) {
      if (data.to !== this.client.id) return;
      this.offMessage(event, fn);
      this.removeListener(event, wrappedFn);
      fn.apply(this, arguments);
    };

    wrappedFn = wrappedFn.bind(this);

    this._onMessageHandlers.push([event, fn, wrappedFn]);
    this.on(event, wrappedFn);
  },

  // Remove function of the
  offMessage(event, func) {
    const toRemove = [];
    for (const arr of this._onMessageHandlers) {
      const [event, fn, wrappedFn] = arr;
      if (func === fn) {
        toRemove.push(arr);
        this.removeListener(event, wrappedFn);
      }
    }

    // TODO
    // this._onErrorHandlers = this._onErrorHandlers.filter((arr) => {
    //   return toRemove.indexOf(arr) < 0;
    // });
  },

  removeAllMessageListeners() {
    for (const [event, , wrappedFn] of this._onMessageHandlers) {
      this.removeListener(event, wrappedFn);
    }

    this._onMessageHandlers.length = 0;
  }
};

/**
* Extends the redisPubSub and adds 5s timeout
*/
const createRedisPubSub = function(port, host, client) {
  invariant(isString(port) && isString(host), 'port and host neded');
  invariant(client.id, 'the client needs an id');

  return new Promise((resolve, reject) => {
    let pubsub = redisPubSub.createClient(port, host);
    pubsub = Object.assign(pubsub, prototype, { client });

    const timeout = setTimeout(() => {
      pubsub.removeListener('ready', onReady); // eslint-disable-line
      reject(createError(504, 'Redis connection timeout'));
    }, ms('5s'));

    const onReady = () => {
      clearTimeout(timeout);
      debug('connected to redis');
      resolve(pubsub);
    };

    pubsub.once('ready', onReady);
  });
};

export { createRedisPubSub };
