import { expect } from 'chai';
import fakeProvider from './fake-provider';
import { createRedisPubSub } from '../src/pubsub';
import constants from '../src/constants';

const {
  NETWORK_PROXY_REQUEST,
  NETWORK_PROXY_OFFER
} = constants;

describe('PubSub', function() {

  it('should create a redis client', async () => {
    const client = {
      id: 'testid'
    };

    let pubsub;
    try {
      pubsub = await createRedisPubSub('6379', '127.0.0.1', client);
    } catch (err) {
      console.error(err);
    }

    expect(pubsub.publish).to.be.a('function');
    pubsub.removeAllMessageListeners();
  });

  it('should connect to redis and send a message o other pubsub client', async (done) => {
    const client1 = { id: 'client1' };
    const client2 = { id: 'client2' };
    let pubsub1;
    let pubsub2;

    try {
      pubsub1 = await createRedisPubSub('6379', '127.0.0.1', client1);
      pubsub2 = await createRedisPubSub('6379', '127.0.0.1', client2);

    } catch (err) {
      console.log(err);
    }

    pubsub1.onMessage('TEST_SIGNAL', (data) => {
      expect(data).to.be.an('object');
      pubsub1.removeAllMessageListeners();
      pubsub2.removeAllMessageListeners();
      done();
    });

    pubsub2.sendMessage('TEST_SIGNAL', 'client1');
  });

  it('should communicate with fake provider', async (done) => {
    fakeProvider();

    const client1 = { id: 'client1' };
    let pubsub1;
    try {
      pubsub1 = await createRedisPubSub('6379', '127.0.0.1', client1);
    } catch (err) {
      console.log(err);
    }

    pubsub1.onMessage(NETWORK_PROXY_OFFER, (data) => {
      expect(data).to.be.an('object');
      pubsub1.removeAllMessageListeners();
      done();
    });

    pubsub1.sendMessage(NETWORK_PROXY_REQUEST, 'fake_provider');
  });

  // TODO

  // it should only receive messages adressed to it
  // should remove one listener
  // should remove all listeners
  // shoud broadcast
});
