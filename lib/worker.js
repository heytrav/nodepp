var Protocol = require('./protocol.js');
var prot = new Protocol();

process.on('message', prot.processMessage);
