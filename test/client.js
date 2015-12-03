import ms from 'ms';
import uuid from 'uuid';

const constants = {
  PROXY_REQUEST: 'proxy:request',
  PROXY_SUPPLY: 'proxy:supply',
  PROXY_LINK: 'proxy:link',
  PROXY_HEARTBEAT: 'proxy:heartbeat',
  PROXY_LINK_DROP: 'proxy:link:drop',
  PROXY_DROP: 'proxy:drop'
};

const { PROXY_REQUEST } = constants;
const PROXY_REQUEST_INTERVAL = ms(1, 'second');

export default class Client{
  constructor() {
    this.proxy = null;
    this.id = uuid.v4();
    this.onProxySupply = ::this.onProxySupply;
    this.onProxyLink = ::this.onProxyLink;
    this.onProxyClosed = ::this.onProxyClosed;
  }

  getProxy() {
    const emitProxyRequest = this._pubsub.send(PROXY_REQUEST).bind(this);
    this.proxyRequesterInterval = setInterval(emitProxyRequest, PROXY_REQUEST_INTERVAL);
    this.onceMessage(PROXY_SUPPLY, this.onProxySupply);
  }

  onProxySupply({ hostId }) {
    this.removeRedisListeners();
    this.message(PROXY_LINK, hostId);
    this.once(PROXY_LINK, this.onProxyLink);
    this.once(PROXY_LINK_DROP, this.onProxyLinkDrop);
  }

  onProxyLink(data) {
    this.proxy = new ProxyLink(data);
    this.on(PROXY_DROP, this.onProxyDrop);

  }

  onProxyLinkDrop() {
    this.removeAllListeners();
    this.getProxy();
  }

  onProxyClose() {
    this.proxy = null;
  }

  removeRedisListeners() {
    clearInterval(this.proxyRequesterInterval);
    this.removeListener(PROXY_SUPPLY, this.onProxySupply);
    this.removeListener(PROXY_LINK, this.onProxyLink);
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
