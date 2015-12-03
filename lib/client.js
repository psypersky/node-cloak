import ms from 'ms';
import createError from 'http-errors';
import invariant from 'invariant';
import { EventEmitter } from 'events';
import createRedisPubSub from './redis-pubsub';

const PROXY_REQUEST = 'proxy:request';
const PROXY_SUPPLY = 'proxy:supply';
const PROXY_LINK = 'proxy:link';
const PROXY_HEARTBEAT = 'proxy:heartbeat';
const PROXY_LINK_DROP = 'proxy:link:drop';
const PROXY_DROP = 'proxy:drop';

const PROXY_REQUEST_INTERVAL = ms(1, 'second');
const PROXY_REQUEST_TIMEOUT = ms(20, 'second');

export default class Client extends EventEmitter {
  constructor() {
    this.proxy = null;
    this.pubsub = null;
    this.onProxySupply = ::this.onProxySupply;
    this.onProxyLink = ::this.onProxyLink;
    this.onProxyClosed = ::this.onProxyClosed;
    this.onProxyReady = ::this.onProxyReady;
  }

  async connect(port, host) {
    this.pubsub = await createRedisPubSub(port, host, this);
  }

  getProxy() {
    invariant(this.pubsub, 'Redis PubSub has not been started');

    const emitProxyRequest = this.pubsub.sendMessage(PROXY_REQUEST).bind(this);
    this.onceMessage(PROXY_SUPPLY, this.onProxySupply);
    this.proxyRequesterInterval = setInterval(emitProxyRequest, PROXY_REQUEST_INTERVAL);

    emitProxyRequest();

    return new Promise((resolve, reject) => {
      this.proxyResolver = resolve;
      this.once(PROXY_READY, this.onProxyReady);

      this.proxyRequesterTimeout = setTimeout(() => {
        this.removeHandlers();
        reject(createError(408));
      }, PROXY_REQUEST_TIMEOUT);
    });
  }

  onProxySupply({ hostId }) {
    this.removeHandlers();
    this.pubsub.message(PROXY_LINK, hostId);
    this.pubsub.onceMessage(PROXY_LINK, this.onProxyLink);
    this.pubsub.onceMessage(PROXY_LINK_DROP, this.onProxyLinkDrop);
  }

  onProxyLink(data) {
    this.removeHandlers();
    this.proxy = new ProxyLink(data);
    this.pubsub.once(PROXY_DROP, this.onProxyDrop);

    this.emit(PROXY_READY, this.proxy);
  }

  onProxyReady() {
    this.removeHandlers();
    const proxyResolver = this.proxyResolver;
    this.proxyResolver = null;
    proxyResolver(proxy);
  }

  onProxyLinkDrop() {
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

class ProxyLink {
  constructor({ client, host, port, clusterId }) {
    this.active = true;
    this.host = host;
    this.port = port;
    this.client = client;
    this.clusterId = clusterId;
    this.heartbeatInterval = null;
    this.onProxyDrop = ::this.onProxyDrop;

    this.heartbeatInterval = setInterval(::this.emitHeartbeat, PROXY_LINK_HEARTBEAT);

    this.client.onceMessage(PROXY_DROP, this.onProxyDrop);
  }

  startHeartbeats() {
    this.heartbeatInterval = setInterval(::this.emitHeartbeat, PROXY_LINK_HEARTBEAT);
  }

  emitHeartbeat() {
    this.client.sendMessage(PROXY_HEARTBEAT, this.clusterId, {
      port: this.port
    });
  }

  stop() {

  }

  onProxyDrop() {
    clearInterval(this.heartbeatInterval);
    this.client.removeListener(PROXY_DROP, this.onProxyDrop);
    this.client.emit(PROXY_DROP);
    this.active = false;
    this.host = null;
    this.port = null;
    this.client = null;
  }
}
