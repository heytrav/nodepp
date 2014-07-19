var protocol = require('./protocol.js');

process.on('message', protocol.processMessage);
