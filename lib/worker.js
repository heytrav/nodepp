var Dispatcher = require('./dispatcher.js');
var dispatch = new Dispatcher();

process.on('message', dispatch.processMessage);
