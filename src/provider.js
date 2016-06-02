import ms from 'ms';
import createError from 'http-errors';
import invariant from 'invariant';
import shortid from 'shortid';
import inspect from 'util-inspect';
import { isObject } from 'lodash';
import { EventEmitter } from 'events';
import path from 'path';
import { createRedisPubSub } from './pubsub';
import constants from './constants';
import ProxyLink from './ProxyLink';
import Cluster from './cluster';

const debug = require('debug')('nc:provider');

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

export default class Client extends EventEmitter {

  constuctor(config = {}) {
    invariant(isObject(config), 'Invalid config');

    super();

    this.pubsub = false;
    this.connecting = false;
    this.id = shortid.generate();

    this.debug(`Creating new Provider`);
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
      console.log(err); // TODO: return an error to the client
      this.connecting = false;
      return;
    }
    this.debug(`PubSub connected`);
    this.connecting = false;
  }

  async createCluster(dirname) {
    dirname = dirname || path.resolve(__dirname, 'data');

    this.cluster = new Cluster(dirname);
    await this.cluster.connect();
  }



  // Create a cluster of tor proxies
  // When ready start to respond to network request petitions

  // On proxy request
    // If proxy available send proxy offer

  // On proxy link
    // If proxy not available anymore reject with proxy unlink
    // If proxy is still available send proxy deliver with the proxy and make unavailable that proxy

  // On network_proxy_drop drop the connection with the client and make available the proxy again

  // Before end process send NETWORK_PROXY_DOWN to all clients

  // On Proxy link timeout end the connection and make available the proxy again


  // Cluster:
  // Number of available connections
  //

}
