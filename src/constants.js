/* eslint-disable no-multi-spaces */

export default {

  /** Network events **/
  NETWORK_PROXY_REQUEST  : 'network:proxy:request', // Request for a proxy
  NETWORK_PROXY_OFFER    : 'network:proxy:offer', // Offers a proxy
  NETWORK_PROXY_LINK     : 'network:proxy:link', // Accept the offer and wait for the proxy
  NETWORK_PROXY_UNLINK   : 'network:proxy:unlink', // The proxy is no available anymore cancel the offer
  NETWORK_PROXY_DELIVER  : 'network:proxy:deliver', // Delivers the proxy
  NETWORK_PROXY_HEARTBEAT: 'network:proxy:heartbeat', // Tells the provider/client you are alive
  NETWORK_PROXY_DOWN     : 'network:proxy:down', // The proxy died for some reason
  NETWORK_PROXY_DROP     : 'network:proxy:drop', // Tells provider to drop the proxy

  /** Client events **/
  CLIENT_PROXY_LINK_TIMEOUT: 'proxy:link:ttl:exceeded', // Timeout in the connection

  /** User events **/
  USER_PROXY_READY    : 'proxy:ready', // Tells the user te proxy is ready and delivers it
  USER_PROXY_DOWN     : 'proxy:down', // Tells the user the proxy is down for some reason
  USER_PROXY_ERROR    : 'proxy:error' // Tells the user there was an erorr and the client is down
};
