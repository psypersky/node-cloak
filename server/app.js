var express = require('express');
var config = require('../config');

var api = require('./api');
var app = express();

app.get('/status', api.status);
app.get('/proxy', api.getProxy);

app.set('port', config.dashboard.port);

// Exports: Express app
//
module.exports = app;
