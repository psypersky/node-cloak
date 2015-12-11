import { expect } from 'chai';
import sinon from 'sinon';
import Client from '../src/client';
import constants from '../src/constants';

const { PROXY_REQUEST, PROXY_SUPPLY } = constants;

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
  });

  it('should try to get a proxy and timeout', async () => {
    const spy = sinon.spy();

    const config = {
      requestTimeout: 90,
      requestInterval: 20
    };

    const client = new Client(config);

    await client.connect();

    client.on('');
  });
});
