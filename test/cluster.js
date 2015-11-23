import shttp from 'socks5-http-client';
import url from 'url';
import debug from 'debug';
import path from 'path';
import { times, uniq } from 'lodash';
import { expect } from 'chai';
import Cluster from '../lib/cluster';

const { TOR_GATEWAYS } = process.env;

describe('Cloak', function() {
  this.timeout(300000); // 5 minutes

  const cluster = new Cluster(path.resolve(__dirname, 'data'));

  before(async () => {
    debug.enable('Tor');
    await cluster.connect();
  });

  it('should connect successfully', () => {
    expect(cluster.ready).to.equal(true);
  });

  it('should get a service instance', () => {
    expect(cluster.getService).to.be.a('function');
    expect(cluster.getService()).to.be.an('object');
    expect(cluster.getService().name).to.not.be.empty; // eslint-disable-line
    expect(cluster.getService().ports.length).to.not.be.empty; // eslint-disable-line
  });

  it('should get a port', () => {
    expect(cluster.getPort()).to.be.a('number');
  });

  it('should rotate and return different ports', function() {
    if (TOR_GATEWAYS < 2) {
      console.warn('The rotation test requires at least two instances.');
      return this.skip();
    }

    const ports = times(TOR_GATEWAYS, () => cluster.getPort());

    expect(ports).to.not.be.empty; // eslint-disable-line
    expect(ports.length).to.equal(uniq(ports).length);
  });

  xit('should return two different IP addresses', async () => {
    const promises = times(TOR_GATEWAYS, () => {
      let port = cluster.getPort();
      return requestWithSocks5Proxy('http://icanhazip.com', port);
    });

    await Promise.all(promises);
  });
});

function requestWithSocks5Proxy(href, port) {
  return new Promise((resolve, reject) => {
    const params = url.parse(href);
    params.socksPort = port;

    console.log('Requesting', params);

    try {
      const req = shttp.get(params, (res) => {
        res.setEncoding('utf8');
        res.on('readable', () => {
          const data = res.read();
          console.log(data);
        });
      });

      req.on('error', reject);
    } catch (err) {
      console.error(err);
    }
  });
}
