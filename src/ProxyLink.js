import ms from 'ms';
import constants from './constants';

const { PROXY_HEARTBEAT, PROXY_DROP } = constants;
const PROXY_HEARTBEAT_INTERVAL = ms(10, 'seconds');
const debug = require('debug')('cloak:ProxyLink');

export default class ProxyLink {
  constructor({ client, host, port, clusterId }) {
    this.active = true;
    this.host = host;
    this.port = port;
    this.client = client;
    this.clusterId = clusterId;
    this.heartbeatInterval = null;
    this.onProxyDrop = ::this.onProxyDrop;

    this.debug(`Starting heartbeat interval`);
    this.heartbeatInterval = setInterval(::this.emitHeartbeat, PROXY_HEARTBEAT_INTERVAL);

    this.client.onceMessage(PROXY_DROP, this.onProxyDrop);

    this.debug(`Created proxy link`);
  }

  debug(msg) {
    debug(`[${this.client.id}]: ${msg}`);
  }

  emitHeartbeat() {
    this.debug(`Heartbeat`);
    this.client.sendMessage(PROXY_HEARTBEAT, this.clusterId, {
      port: this.port
    });
  }

  stop() {
    this.debug(`Stopping (todo)`);
    // todo
  }

  onProxyDrop() {
    this.debug(`Dropping proxy`);

    clearInterval(this.heartbeatInterval);
    this.client.removeListener(PROXY_DROP, this.onProxyDrop);
    this.client.emit(PROXY_DROP);
    this.active = false;
    this.host = null;
    this.port = null;
    this.client = null;
  }
}
