/* jshint expr: true */

var _ = require('lodash');
var async = require('async');
var expect = require('chai').expect;
var config = require('../config');
var cloak = require('../lib/cloak');
var shttp = require('socks5-http-client');

describe('Cloak', function() {
	this.timeout(300000); // 5 minutes

	before( function(done) {
		console.log('Hint: Start with DEBUG=Tor to see connection status msgs');
		cloak.connect(done);
	});

	it('should connect successfully', function() {
		expect(cloak.ready).to.equal(true);
	});

	it('should get a service instance', function() { 
		expect(cloak.getService().name).to.not.be.empty;
		expect(cloak.getService().ports.length).to.not.be.empty;
	});

	it('should get a port', function() {
		expect(cloak.getPort()).to.not.be.empty;
	});

	it('should rotate and return different ports', function() {
		if ( config.tor.instances < 2 ) {
			console.warn('The rotation test requires at least two instances.');
			return;
		}

		var ports = _.times(config.tor.instances, function() {
			return cloak.getPort();
		});

		expect(ports).to.not.be.empty;
		expect(ports.length).to.equal( _.uniq(ports).length );
	});

	xit('should return two different IP addresses', function(done) {
		async.times(config.tor.instances, function(callback) {
			var requestParams = {
				socksPort: cloak.getPort(),
				hostname: 'http://curlmyip.com',
				port: 80, 
				path: '/',
			};

			shttp.get(requestParams, function(res) {
				res.setEncoding('utf8');
				res.on('readable', function() {
					console.log( res.read() );
				});
			});

		}, function(err) {
			if (err) return done(err);
			console.log('FINISHED....');
		});
	});
});
