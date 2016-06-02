import { times, findWhere, reduce } from 'lodash';
import promisify from 'promisify-node';
import inspect from 'util-inspect';
import mkdirp from 'mkdirp';
import assert from 'assert';
import THS from 'ths';

const debug = require('debug')('nc:cluster');
const onTorError = ::console.error;
const onTorMessage = debug;

/**
 *Creates a pool of tor hidden service instances.
 * Each instance is a different TOR process
 *
 * @param  {String}  dataDir  The root directory to be used for instance data
 * @param {String} [providerId] The provider's id to debug propuses
 */
export default class THSCluster {
  constructor(dataDir, torGateways = 2, portRangeStart = 10770, providerId) {
    this.starting = false;
    this.ready = false;
    this.dataDir = dataDir;
    this.freeInstances = [];
    this.bussyInstances = [];
    this.debugRef = providerId ? `[${this.id}] ` : '';
    this.torGateways = torGateways;
    this.portRangeStart = portRangeStart;

    debug(`Creating cluster in ${dataDir} with ${torGateways} instances`);

    times(torGateways, ::this.addInstance);
  }

  debug(msg) {
    debug(`${this.debugRef}${msg}`);
  }

  /**
   * Starts tor, connects all the hidden services in the pool
   * @return {Promise}
   */
  async connect() {
    assert(!this.starting && !this.ready, 'Cluster was already connected');

    this.starting = true;

    console.log('Connecting Tor processes...');

    await Promise.all(this.freeInstances.map((ths) => ths.start(true)));

    this.starting = false;
    this.ready = true;

    console.log(`Tor connected with ${this.instances.length} instances`);
  }

  addInstance() {
    const instanceCount = this.instances.length;
    const thsPort = this.portRangeStart + instanceCount;
    const ctrlPort = this.portRangeStart + this.torGateways + instanceCount;
    const thsPath = `${this.dataDir}/${thsPort}`;
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

    this.freeInstances.push(ths);
  }

  /**
   * Returns the running tor services in the cluster.
   * @return {Array}  Tor services running in the cluster.
   */
  get services() {
    const list = reduce(this.instances, (list, ths) => {
      if (ths.isTorRunning()) {
        const services = ths.getServices();
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
   * Get a not currently in use port and set the port as bussy
   *
   * TODO: Could we have a service with no ports in this phase?
   */
  getInstance() {
    if (this.freeInstances.length) {
      const thsInstance = this.freeInstances.pop();
      this.bussyInstances.unshift(thsInstance);
      return thsInstance;
      // TODO
      // TODO: Could we have services with no ports?
    }
    return null;
  }

  /**
   * Returns the number of available ports
   */
  getFreeInstancesCount() {
    return this.freeInstances.length;
  }

  /**
   * Renew the ip of the instance and send it to the
   * free instances array after that
   *
   * @param {number} port
   */
  async freeAndRenewInstance(instance) {

    const index = this.bussyInstances.indexOf(instance);
    if (index === -1) {
      return false;
    }

    await instance.cleanCircuits();
    const thsInstance = this.bussyInstances.splice(index, 1);
    this.freeInstances.push(thsInstance);
    return true;
  }
}





