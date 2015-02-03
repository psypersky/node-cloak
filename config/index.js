var fs = require('fs');
var env = process.env.NODE_ENV || 'default';
var envConfigPath = fs.existsSync('./'+env) ? './'+env :'./default';

// environment-based config file
var config = require(envConfigPath);

config.PROXY_COUNT = config.tor ? config.tor.instances : 4;
config.PORT_RANGE_START = config.tor ? config.tor.port : 10770;

// Exports: config object
//
module.exports = config;
