import { createRedisPubSub } from '../src/pubsub';
import constants from '../src/constants';

const {
  NETWORK_PROXY_REQUEST,
  NETWORK_PROXY_OFFER,
  NETWORK_PROXY_DELIVER,
  NETWORK_PROXY_LINK
} = constants;

const debug = require('debug')('nc:fakeProvider');

export default async function fakeProvider() {

  debug('running fake provider');

  const client = {
    id: 'fake_provider'
  };

  let pubsub;
  try {
    pubsub = await createRedisPubSub('6379', '127.0.0.1', client);
  } catch (err) {
    return console.error(err);
  }

  // When someone request for a proxy always respond we have one
  pubsub.on(NETWORK_PROXY_REQUEST, (data) => {
    debug(`got proxy request from ${data.hostId}`);
    pubsub.sendMessage(NETWORK_PROXY_OFFER, data.hostId);
    debug('sent proxy offer');
  });

  // When someone request for the proxy give a fake proxy
  // and do heart beats
  pubsub.onMessage(NETWORK_PROXY_LINK, (data) => {
    debug(`got proxy link from ${data.hostId}`);
    pubsub.sendMessage(NETWORK_PROXY_DELIVER, data.hostId, { host: '127.0.0.1', port: '8080' });
    debug('sent proxy deliver');
  });
}
