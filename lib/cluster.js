import { times, findWhere, reduce } from 'lodash';
import promisify from 'promisify-node';
import inspect from 'util-inspect';
import mkdirp from 'mkdirp';
import assert from 'assert';
import THS from 'ths';

const debug = require('debug')('cluster');
const TOR_GATEWAYS = parseInt(process.env.TOR_GATEWAYS);
const PORT_RANGE_START = parseInt(process.env.PORT_RANGE_START);
const onTorError = ::console.error;
const onTorMessage = ::console.log;

/**
 * Creates a pool of tor hidden service instances.
 *
 * @param  {String}  dataDir  The root directory to be used for instance data
 */
export default class THSCluster {
  constructor(dataDir) {
    this.starting = false;
    this.ready = false;
    this.dataDir = dataDir;
    this.instances = [];
    this.serviceRotationIndex = 0;

    debug(`Creating cluster in ${dataDir} with ${TOR_GATEWAYS} instances`);

    times(TOR_GATEWAYS, ::this.addInstance);
  }

  /**
   * Starts tor, connects all the hidden services in the pool
   * @return {Promise}
   */
  async connect() {
    assert(!this.starting && !this.ready, 'Cluster was already connected');

    this.starting = true;

    console.log('Connecting Tor processes...');

    await Promise.all(this.instances.map((ths) => ths.start(true)));

    this.starting = false;
    this.ready = true;

    console.log(`Tor connected with ${this.instances.length} instances`);
  }

  addInstance() {
    const instanceCount = this.instances.length;
    const ctrlPort  = PORT_RANGE_START + TOR_GATEWAYS + instanceCount;
    const thsPort = PORT_RANGE_START + instanceCount;
    const thsPath  = `${this.dataDir}/${thsPort}`;
    const serviceName = `port_${thsPort}`;

    debug(`Creating instance in port: ${thsPort}. ctrlPort: ${ctrlPort}`);
    mkdirp.sync(thsPath);

    const ths = new THS(thsPath, thsPort, ctrlPort, onTorError, onTorMessage);
    ths.start = promisify(ths.start);

    debug(`Services are ${inspect(ths.getServices())}`);

    // Remove erroneous services
    ths.getServices()
      .filter((service) => service.name !== serviceName)
      .forEach((service) => {
        debug(`Removing service ${service.name}`);
        ths.removeHiddenService(service.name, true);
      });

    // Register this port's hidden service
    if (!findWhere(ths.getServices(), { name: serviceName })) {
      ths.createHiddenService(serviceName, thsPort, true);
    }

    this.instances.push(ths);
  }

  /**
   * Returns the running tor services in the cluster.
   * @return {Array}  Tor services running in the cluster.
   */
  get services() {
    const list = reduce(this.instances, (list, ths) => {
      if (ths.isTorRunning()) {
        let services = ths.getServices();
        if (services.length) {
          list.push(services[0]);
        }
      }
      return list;
    }, []);

    debug(`Getting services: ${inspect(list)}`);

    return list;
  }

  /**
   * Gets a difference service every time this method is invoked.
   * @return {Object}  A tor hidden service definition.
   */
  getService() {
    this.serviceRotationIndex++;

    const services = this.services;
    const port = PORT_RANGE_START + this.serviceRotationIndex;
    let service = findWhere(services, { name: `port_${port}` });

    if (!service) {
      this.serviceRotationIndex = 0;
      service = services[0];
    }

    return service;
  }

  getPort() {
    const service = this.getService();

    if (!service || !service.ports.length) {
      return null;
    }

    return parseInt(service.ports[0]);
  }
}
