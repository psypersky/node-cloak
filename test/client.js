import { expect } from 'chai';
import Client from '../src/client';
import fakeProvider from './fake-provider';
// import sinon from 'sinon';
// const spy = sinon.spy();

describe('Client', function() {
  it('should connect to redis and wait for ready state', async () => {
    const client = new Client();

    expect(client.proxy).to.equal(null);
    expect(client.pubsub).to.equal(null);
    expect(client.connecting).to.equal(false);

    const promise = client.connect();

    expect(client.connecting).to.equal(true);
    expect(client.pubsub).to.equal(null);

    await promise;

    expect(client.connecting).to.equal(false);
    expect(client.pubsub).to.be.an('object');
    client.destroy();
  });

  it('should try to get a proxy and timeout', async (done) => {
    const config = {
      requestTimeout: 90,
      requestInterval: 20
    };

    const client = new Client(config);

    await client.connect();

    client.onProxyError((err) => {
      expect(err).to.be.an('Object');
      client.destroy();
      done();
    });

    await client.createProxy();
  });

  it('should get a fake proxy', async function(done) {
    fakeProvider();
    const client = new Client();
    await client.connect();
    client.createProxy();

    client.onProxyReady((proxy) => {
      expect(proxy.hostId).to.be.equal('fake_provider');
      expect(proxy.host).to.be.equal('127.0.0.1');
      expect(proxy.port).to.be.equal('8080');
      client.destroy();
      done();
    });

    client.onProxyDown((err) => {
      client.destroy();
      done(err);
    });

    client.onProxyError((err) => {
      client.destroy();
      done(err);
    });
  });

  it.skip('should create and return a proxy', async () => {
    const client = new Client();
    client.connect();
    client.createProxy();
    client.onProxyDrop((reason) => { console.log('Proxy drop: ', reason); });
    client.onProxyLink((proxy) => { console.log('Got proxy: ', proxy); });
    client.onProxyError((err) => { console.log('Proxy Error: ', err); });
  });

  // Should Get a proxy
});
