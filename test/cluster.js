import shttp from 'socks5-https-client';
import url from 'url';
import debug from 'debug';
import path from 'path';
import { times, uniq } from 'lodash';
import { expect } from 'chai';
import Cluster from '../src/cluster';

const { TOR_GATEWAYS } = process.env;

describe('Cluster', function() {
  this.timeout(30000);

  const cluster = new Cluster(path.resolve(__dirname, 'data'), 3);
  let instance1;
  let instance2;
  let instance3;

  before(async () => {
    debug.enable('Tor');
    await cluster.connect();
  });

  it('should connect successfully', () => {
    expect(cluster.ready).to.equal(true);
  });

  it('should get the number of available ports', () => {
    expect(cluster.getFreeInstancesCount()).to.be.a('number');
    expect(cluster.getFreeInstancesCount()).to.equal(3);
  });

  it('shoud get an instance', () => {
    instance1 = cluster.getInstance();
    expect(instance1).to.be.an('object');
    expect(instance.name).to.not.be.empty; // eslint-disable-line
    expect(instance.ports.length).to.not.be.empty; // eslint-disable-line
  });

  it('shoud get all available instances', () => {
    expect(cluster.getFreeInstancesCount()).to.equal(2);
    instance2 = cluster.getInstance();
    instance3 = cluster.getInstance();
    expect(cluster.getFreeInstancesCount()).to.equal(0);
  });

  it('shoud free all instances', async () => {
    await cluster.freeAndRenewInstance(instance1);
    await cluster.freeAndRenewInstance(instance2);
    await cluster.freeAndRenewInstance(instance3);
    expect(cluster.getFreeInstancesCount()).to.equal(3);
  });

  it('should return two different IP addresses', async () => {
    const promises = times(TOR_GATEWAYS, () => {
      const port = cluster.getFreePort();
      return requestWithSocks5Proxy('http://icanhazip.com', port);
    });

    const ips = await Promise.all(promises);

    expect(uniq(ips).length).to.equal(parseInt(TOR_GATEWAYS, 10));
  });
});

function requestWithSocks5Proxy(href, port) {
  return new Promise((resolve, reject) => {
    const params = url.parse(href);
    params.socksPort = port;
    params.socksHost = '127.0.0.1';

    const req = shttp.get({
      hostname: 'icanhazip.com',
      socksPort: port,
      socksHost: '127.0.0.1',
      path: '/',
      rejectUnauthorized: true // This is the default.
    }, function(res) {
      res.setEncoding('utf8');
      res.on('readable', function() {
        resolve(res.read());
      });
    });

    req.on('error', reject);

  });
}
