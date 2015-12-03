import redisPubSub from 'redis-pubsub-emitter';

const prototype = {
  send(event, data) {
    const message = this.createMessage(data);
    this.publish(event, message);
  },
  sendMessage(event, data, to) {
    const message = this.createMessage(data, to);
    this.publish(event, message);
  },
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
  onMessage(event, fn) {
    let wrappedFn = function(data) {
      if (data.to !== this.client.id) return;
      fn.apply(this, arguments);
    };

    wrappedFn = wrappedFn.bind(this);

    this._onMessageHandlers.push([event, fn, wrappedFn]);
    this.on(event, wrappedFn);
  },
  onceMessage(event, fn) {
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
  offMessage(event, func) {
    const toRemove = [];
    for (arr of this._onMessageHandlers) {
      const [event, fn, wrappedFn] = arr;
      if (func === fn) {
        toRemove.push(arr);
        this.removeListener(event, wrappedFn);
      }
    }

    this._onErrorHandlers = this._onErrorHandlers.filter((arr) => {
      return toRemove.indexOf(arr) < 0;
    })
  },
  removeAllMessagelisteners() {
    for ([event, fn, wrappedFn] of this._onMessageHandlers) {
      this.removeListener(event, wrappedFn);
    }

    this._onMessageHandlers.length = 0;
  }
};

export default function createRedisPubSub(port, host, client) {
  let pubsub = redisPubSub.createClient(port, host);

  pubsub = Object.assign(pubsub, prototype, { client });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pubsub.removeListener('ready', onReady);
      reject();
    }, ms(5, 'seconds'));

    const onReady = () => {
      clearTimeout(timeout);
      resolve(pubsub);
    };

    pubsub.once('ready', onReady);
  });
}
