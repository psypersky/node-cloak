import ms from 'ms';
import createError from 'http-errors';
import invariant from 'invariant';
import shortid from 'shortid';
import inspect from 'util-inspect';
import { isObject } from 'lodash';
import { EventEmitter } from 'events';
import { createRedisPubSub } from './pubsub';
import constants from './constants';
import ProxyLink from './ProxyLink';

const {
  PROXY_REQUEST,
  PROXY_SUPPLY,
  PROXY_LINK,
  PROXY_LINK_DROP,
  PROXY_READY,
  PROXY_DROP
} = constants;

const debug = require('debug')('cloak:client');
const PROXY_REQUEST_INTERVAL = ms(1, 'second');
const PROXY_REQUEST_TIMEOUT = ms(20, 'second');

export default class Client extends EventEmitter {
  constructor(config = {}) {
    invariant(isObject(config), 'Invalid config');

    super();

    this.proxy = null;
    this.pubsub = null;
    this.connecting = false;
    this.id = shortid.generate();

    this.requestInterval = config.requestInterval || PROXY_REQUEST_INTERVAL;
    this.requestTimeout = config.requestTimeout || PROXY_REQUEST_TIMEOUT;

    this.onProxySupply = ::this.onProxySupply;
    this.onProxyLink = ::this.onProxyLink;
    this.onProxyClosed = ::this.onProxyClosed;
    this.onProxyReady = ::this.onProxyReady;

    debug(`Creating new client`);
  }

  debug(msg) {
    debug(`[${this.id}] ${msg}`);
  }

  async connect(port, host) {
    this.connecting = true;

    host = host || '127.0.0.1';
    port = port || '6379';

    this.debug(`Connecting to ${host}:${port}`);

    try {
      this.pubsub = await createRedisPubSub(port, host, this);
    } catch (err) {
      console.log(err);
      this.connecting = false;
      return;
    }
    this.debug(`PubSub connected`);
    this.connecting = false;
  }

  getProxy() {
    invariant(this.pubsub, 'Redis PubSub has not been started');

    debug(`Requesting proxy`);

    this.onceMessage(PROXY_SUPPLY, this.onProxySupply);
    this.once(PROXY_READY, this.onProxyReady);

    const emitProxyRequest = this.pubsub.sendMessage(PROXY_REQUEST).bind(this);
    this.proxyRequesterInterval = setInterval(emitProxyRequest, PROXY_REQUEST_INTERVAL);

    emitProxyRequest();

    return new Promise((resolve, reject) => {
      this.proxyResolver = resolve;

      this.proxyRequesterTimeout = setTimeout(() => {
        this.debug(`Proxy request timeout`);
        this.removeHandlers();
        reject(createError(408));
      }, PROXY_REQUEST_TIMEOUT);
    });
  }

  onProxySupply({ hostId }) {
    this.debug(`Proxy supply in ${hostId}`);
    this.removeHandlers();
    this.pubsub.message(PROXY_LINK, hostId);
    this.pubsub.onceMessage(PROXY_LINK, this.onProxyLink);
    this.pubsub.onceMessage(PROXY_LINK_DROP, this.onProxyLinkDrop);
  }

  onProxyLink(data) {
    this.debug(`Proxy link from ${inspect(data)}`);
    this.removeHandlers();
    this.proxy = new ProxyLink(data);
    this.pubsub.once(PROXY_DROP, this.onProxyDrop);

    this.emit(PROXY_READY, this.proxy);
  }

  onProxyReady(proxy) {
    this.debug(`Proxy is ready`);
    this.removeHandlers();
    const proxyResolver = this.proxyResolver;
    this.proxyResolver = null;
    proxyResolver(proxy);
  }

  onProxyLinkDrop() {
    this.debug(`Proxy link request dropped`);
    this.removeHandlers();
    this.getProxy();
  }

  onProxyClosed() {
    this.proxy = null;
  }

  removeHandlers() {
    this.proxyResolver = null;
    this.pubsub.offMessage(PROXY_SUPPLY, this.onProxySupply);
    this.pubsub.offMessage(PROXY_LINK, this.onProxyLink);
    this.pubsub.offMessage(PROXY_LINK_DROP, this.onProxyLinkDrop);
    this.removeListener(PROXY_READY, this.onProxyReady);
    clearInterval(this.proxyRequesterInterval);
    clearTimeout(this.proxyRequesterTimeout);
  }

  destroy() {
    this.debug(`Destroying client`);
    this.removeHandlers();
    this.pubsub.removeAllListeners();
    this.pubsub.removeAllMessageListeners();
    this.pubsub = null;

    if (this.proxy) {
      this.proxy.stop();
      this.proxy = null;
    }
  }
}
