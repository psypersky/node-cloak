import ms from 'ms';
import { EventEmitter } from 'events';
import constants from './constants';

const { NETWORK_PROXY_HEARTBEAT, CLIENT_PROXY_LINK_TIMEOUT } = constants;
const PROXY_HEARTBEAT_INTERVAL = ms('1 second');
const PROXY_TTL = ms('5 seconds');
const debug = require('debug')('nc:proxyLink');

/** Holds the proxy information
 *  emits heatbeats to the provider using the client to send events
 *  listen to providers heartbeats and kill proxy on timeout
 */

export default class ProxyLink extends EventEmitter {
  constructor(client, { hostId, data: { host, port } }) {
    super();
    this.active = true;
    this.host = host;
    this.port = port;
    this.client = client;
    this.hostId = hostId;
    this.providerHeartbeatInterval = null;

    this.onHeartbeat = ::this.onHeartbeat;
    this.onTimeout = ::this.onTimeout;

    this.providerHeartbeatInterval = setInterval(::this.emitHeartbeat, PROXY_HEARTBEAT_INTERVAL);

    this.client.pubsub.onMessage(NETWORK_PROXY_HEARTBEAT, this.onHeartbeat);
    this.TTLTimeoutId = setTimeout(this.onTimeout, PROXY_TTL);

    debug(`created proxy link ${host} ${port} ${hostId}`);
  }

  debug(msg) {
    debug(`[${this.client.id}]: ${msg}`);
  }

  emitHeartbeat() {
    this.debug(`Heartbeat`);
    this.client.pubsub.sendMessage(NETWORK_PROXY_HEARTBEAT, this.hostId, {
      port: this.port
    });
  }

  onHeartbeat() {
    debug('received heartbeat');
    clearTimeout(this.TTLTimeoutId);
    this.TTLTimeoutId = setTimeout(this.onTimeout, PROXY_TTL);
  }

  stop() {
    debug('killing proxy link');
    clearInterval(this.providerHeartbeatInterval);
    this.removeAllListeners();
    this.active = false;
    this.host = null;
    this.port = null;
    this.client = null;
  }

  onTimeout() {
    debug('connection with the provider lost');
    this.emit(CLIENT_PROXY_LINK_TIMEOUT);
  }
}
