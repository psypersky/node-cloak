var cloak = require('../lib/cloak');

exports.status = function(req, res, next) {
	res.json({
		ready: cloak.ready,
		services: cloak.services,
		starting: cloak.starting,
		instances: cloak.instances,
	});
};

exports.getProxy = function(req, res, next) {
	if ( !cloak.ready )
		return res.send(503);

	res.set('Content-Type', 'text/plain');
	res.send(cloak.getProxy());
};
