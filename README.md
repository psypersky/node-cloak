# NigthCrawler (Work in progress)

The idea is that you use the client to ask for fresh tor proxies to a cloud of a redis pub-sub servers,
ideal to use in scrapers

[Short Description here]

### Dependencies
- Tor
- Redis

Client Overview

    const client = new Client();
    await client.connect();
    client.createProxy();

    client.onProxyReady((proxy) => {
        console.log('Got proxy', proxy);
    });

    client.onProxyDown((err) => {
      done(err);
    });

    client.onProxyError((err) => {
      done(err);
    });


Provider Overview

    const provider = new Provider();

    await provider.connect();

    await provider.createCluster();

    provider.startProviding();









Redis PubSub

Client.getProxy
emit "proxy:request" every 1 second
once message "proxy:supply", send message "proxy:link" with server UUID
once message "proxy:link", (CREATES PROXY) sets proxy link and starts doing heartbeats to mantain connection
once message "proxy:dropLink", repeat "proxy:request"
once on TTL exeded, repeat "proxy:request"


Client API

client = new Client()
client.connect(port, host)
client.createProxy()
client.onProxyDrop()
client.onProxyLink()


Server.serveProxy
On "proxy:request", if proxies available, send message "proxy:supply"
On message "proxy:link": proxies available
  ? send "proxy:link" with host and port, and remove proxy availability (CONSUME PROXY). setTimeout to drop the proxy,1
  : send "proxy:dropLink"


ClientProxy.destroy
Server on "proxy:destroy", change tor IP, stop heartbeat listening, after tor is OK make proxy available





Client instance (UUID)
Server instance (UUID, host);

message:
{
  UUID: UUID,
  to: UUID,    // optional
  data: Mixed  // optional
}


emit(event[, data])
sendMessage(event, targetId[, data])


listener: if message is not directed to this, abort (?)

.on (normal, discards any "to" message?)
.onMessage (Discards if `to` is not own ID)


Client instance: (EventEmitter)
UUID (generated)
Redis connection
^getProxy
+
^emit
^on
^sendMessage
^onMessage
^once

Client Proxy instance: (Event Emitter)
host
port
clusterId: UUID
destroy: Fn -> sendMessage "proxy:destroy" to proxy's cluster to destroy it