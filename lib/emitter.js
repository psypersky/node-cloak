var events = require('events');

// Exports: App-wide event emitter
//
module.exports = new (events.EventEmitter)();
