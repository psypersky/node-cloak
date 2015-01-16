var _ = require('lodash');
var THS = require('ths');
var config = require('../config');

var PROXY_COUNT = config.PROXY_COUNT;
var PORT_RANGE_START = config.PORT_RANGE_START;

var onTorError = console.error.bind(console);
var onTorMessage = console.log.bind(console);

// Exports: Array of tor hidden service instances
var thsPool = module.exports = _.times(PROXY_COUNT, function(i) {
	var ctrlPort  = PORT_RANGE_START+PROXY_COUNT+i;
	var thsPort = PORT_RANGE_START+i;

	var root  = '/data/tor-pool/'+thsPort;
	var ths = new THS(root, thsPort, ctrlPort, onTorError, onTorMessage);

	return ths;
});

// registers Tor's hidden services
thsPool.registerServices = function() {
	_.each(thsPool, function(ths) {
		var thsServices = ths.getServices();
		var thsPort     = ths.socksPort();
		
		if ( thsServices.length === 0 ) {
			ths.createHiddenService('nest_port_'+thsPort, thsPort, true);
		}
	});
};
