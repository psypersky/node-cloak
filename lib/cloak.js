var _ = require('lodash');
var async = require('async');
var debug = require('debug')('Tor');
var config = require('../config');

// array of tor hidden services
var thsPool = require('./pool');

// used to rotate a service every time a service is requested
var _serviceRotationIndex = 0;

// Exports: Tor hidden service pool manager.
//
var cloak = module.exports = {
	starting: false,
	ready: false,
};


// starts tor, connects all the hidden services in the pool
cloak.connect = function(callback) {
	if ( cloak.starting || cloak.ready ) {
		_.defer(callback);
		return false;
	}

	cloak.starting = true;

	console.log('Connecting Tor processes...');

	async.each(thsPool, function(service, callback) {
		service.start(true, callback);
	}, function() {

		cloak.ready = true;
		cloak.starting = false;

		console.log(
			'Tor connected:\n'+
			JSON.stringify(cloak.services, null, 3));

		callback();
	});

	return true;
};

// gets a different service every time it is invoked
cloak.getService = function() {
	_serviceRotationIndex++;

	var services = cloak.services;
	var service = _.findWhere(services, {
		name: 'nest_port_'+(config.PORT_RANGE_START+_serviceRotationIndex),
	});

	if ( !service ) {
		_serviceRotationIndex = 0;
		service = services[0];
	}

	return service;
};

cloak.getPort = function() {
	var service = cloak.getService();

	if ( !service || !service.ports.length ) 
		return null;

	return service.ports[0];
};

// Getter: cloak.services
// Returns an array with all the running tor services
//
Object.defineProperty(cloak, 'services', {
	get: function() {
		return _.reduce(thsPool, function(list, ths) {
			if ( ths.isTorRunning() ) {
				var services = ths.getServices();
				if ( services.length ) {
					list.push(services[0]);
				}
			}
			return list;
		}, []);
	},
});
