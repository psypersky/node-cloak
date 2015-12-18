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

const debug = require('debug')('nc:client');

const {
  NETWORK_PROXY_REQUEST,
  NETWORK_PROXY_OFFER,
  NETWORK_PROXY_LINK,
  NETWORK_PROXY_UNLINK,
  NETWORK_PROXY_DELIVER,
  NETWORK_PROXY_DOWN,
  CLIENT_PROXY_LINK_DROP,
  CLIENT_PROXY_LINK_TIMEOUT,
  USER_PROXY_READY,
  USER_PROXY_DOWN,
  USER_PROXY_ERROR
} = constants;

const PROXY_REQUEST_INTERVAL = ms('1 seconds');
const PROXY_REQUEST_TIMEOUT = ms('20 seconds');

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

    this.onTimeout = ::this.onTimeout;
    this.onProxyOffer = ::this.onProxyOffer;
    this.onProxyDeliver = ::this.onProxyDeliver;
    this.onProxyLinkTimeout = ::this.onProxyLinkTimeout;
    this.onProxyLinkDown = ::this.onProxyLinkDown;

    this.debug(`Creating new client`);
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

  /**
  * Ask redis Pub/Sub for a proxy and return it to the user
  */
  createProxy() {
    invariant(this.pubsub, 'Redis PubSub has not been started');

    this.debug(`Requesting proxy`);

    // listen to offers of proxies
    this.pubsub.onceMessage(NETWORK_PROXY_OFFER, this.onProxyOffer);

    // Emits a proxy request each x seconds
    const emitProxyRequest = this.pubsub.send.bind(this.pubsub, NETWORK_PROXY_REQUEST);
    this.proxyRequesterInterval = setInterval(emitProxyRequest, this.requestInterval);
    emitProxyRequest();

    // If no response in a long time commit suicide
    this.proxyRequesterTimeout = setTimeout(this.onTimeout, this.requestTimeout);
  }

  /**
  * Cant find a proxy on the network
  * emmits an error and kill the client
  */
  onTimeout() {
    this.debug(`Could not find proxies on the network, committing suicide`);
    this.removeHandlers();
    this.emit(USER_PROXY_ERROR, createError(408));
  }

  /**
  * The provider tells you he has an available proxy
  * Ask for the proxy's data
  */
  onProxyOffer({ hostId }) {
    this.debug(`Proxy supply in ${hostId}`);
    this.pubsub.sendMessage(NETWORK_PROXY_LINK, hostId);
    this.pubsub.onceMessage(NETWORK_PROXY_UNLINK, this.onProxyLinkDown);
    this.pubsub.onceMessage(NETWORK_PROXY_DELIVER, this.onProxyDeliver);
  }

  /**
  * Receive the proxy's data, create a link
  * and send the proxy to the user
  */
  onProxyDeliver(data) {
    this.debug(`Proxy received ${inspect(data)}`);

    // Stops listening for events and removes the timeout
    this.removeHandlers();

    this.proxy = new ProxyLink(this, data);
    this.proxy.once(CLIENT_PROXY_LINK_TIMEOUT, this.onProxyLinkTimeout);

    this.pubsub.onceMessage(NETWORK_PROXY_DOWN, this.onProxyLinkDown);

    this.emit(USER_PROXY_READY, this.proxy);
  }

  /**
   * The ProxyLink lost connection with the provider get another proxy
   */
  onProxyLinkTimeout() {
    this.debug('proxy timeout killing proxy and getting a new one');
    this.emit(USER_PROXY_DOWN, CLIENT_PROXY_LINK_TIMEOUT);
    this.proxy.stop();
    this.proxy = null;
    this.removeHandlers();
    this.getProxy();
  }

  /**
   * If the proxy is down or the offer was rejected get another proxy
   */
  onProxyLinkDown() {
    this.debug('provider droped proxy, getting a new one');
    this.emit(USER_PROXY_DOWN, CLIENT_PROXY_LINK_DROP);
    this.proxy.stop();
    this.proxy = null;
    this.removeHandlers();
    this.getProxy();
  }

  /**
  * Remove all connection handlers
  */
  removeHandlers() {
    this.debug('removing handlers');
    this.pubsub.offMessage(NETWORK_PROXY_OFFER, this.onProxyOffer);
    this.pubsub.offMessage(NETWORK_PROXY_UNLINK, this.onProxyLinkDown);
    this.pubsub.offMessage(NETWORK_PROXY_DELIVER, this.onProxyDeliver);
    this.pubsub.offMessage(NETWORK_PROXY_DOWN, this.onProxyLinkDown);
    clearInterval(this.proxyRequesterInterval);
    clearTimeout(this.proxyRequesterTimeout);
  }

  /**
  * Destroys de client
  */
  destroy() {
    this.debug(`Destroying client`);
    this.removeHandlers();
    this.removeAllListeners();
    this.pubsub.removeAllListeners();
    this.pubsub.removeAllMessageListeners();
    this.pubsub = null;

    if (this.proxy) {
      this.proxy.stop();
      this.proxy = null;
    }
  }

  /**
  * API
  */
  onProxyReady(fn) {
    this.on(USER_PROXY_READY, fn);
  }
  onProxyDown(fn) {
    this.on(USER_PROXY_DOWN, fn);
  }
  onProxyError(fn) {
    this.on(USER_PROXY_ERROR, fn);
  }
}
