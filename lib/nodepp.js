var forever = require('forever-monitor'),
    nconf = require('nconf');
var winston = require('winston');
var nconf = require('nconf');
nconf.env();
var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: log_level })
    ]
});

logger.debug("Got environment: ", nconf.get('EPP_REGISTRIES'));

var child = new(forever.Monitor)('./lib/server.js', {
    max: 1,
    silent: true,
    pidFile: "nodepp.pid",
    logFile: "nodepp.log",
    outFile: "node-stout.log",
    errFile: "nodepp-sterr.log",
    options:['--registries', 'registry-test3', '--registries', 'registry-test1', '--registries', 'registry-test2']

});
child.on('exit', function() {
    logger.debug("the program has exited.");
});

child.start();
