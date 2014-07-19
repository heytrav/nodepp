var protocol = require('./protocol.js');
var prot = protocol();

process.on('message', prot.processMessage);
