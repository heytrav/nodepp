var cp = require('child_process');
var program = require('commander');
var moment = require('moment');
var AMQP = require('amqp-as-promised');
var Q = require('q');
var path = require('path');
var nconf = require('nconf');
var winston = require('winston');

nconf.env().file({
    "file": path.resolve(__dirname, '..', 'config/epp-config.json')
});

var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: log_level })
    ]
});

var rabbitmqConfig = nconf.get('rabbitmq');
// Environment values override the config values if present.
var rabbitmqHost = nconf.get('RABBITMQ_TRANSPORT_SERVICE_HOST');
var rabbitmqPort = nconf.get('RABBITMQ_TRANSPORT_SERVICE_PORT');

if (rabbitmqHost && rabbitmqPort) {
    rabbitmqConfig.connection.host = rabbitmqHost;
    rabbitmqConfig.connection.port = rabbitmqPort;
}

function collectRegistries(val, registryArgs) {
    registryArgs.push(val);
    return registryArgs;
}

// Read command-line arguments.
program.version('0.0.1').usage('[options]').option('-r, --registries <registry>', 'Registry', collectRegistries, []).option('-q, --amqphost <host address>', 'Rabbit Host');
program.parse(process.argv);

var registries = program.registries;
var amqpHost = program.amqphost;
if (amqpHost !== undefined) {
    rabbitmqConfig.connection.host = amqpHost;
}
logger.debug("Initialised with registries: ", registries);

var availableProcesses = {};
logger.debug("Connecting to AMQP server at: ",rabbitmqConfig.connection);
var amqpConnection = new AMQP(rabbitmqConfig.connection);
var eppServerWorker = function(registry, childProcess) {
    var topic = ['eppServer', registry].join('.');
    amqpConnection.serve('epp', topic, function(msg, headers, del) {
        var deferred = Q.defer();
        var a = moment();
        var command = '';
        if (msg.hasOwnProperty('command')) {
            command = msg.command;
        }
        childProcess.once('message', function(m) {
            var b = moment();
            var diff = b.diff(a, 'milliseconds');
            logger.info(command + ' request elapsed time: ' + diff.toString() + ' ms');
            deferred.resolve(m);
        });
        childProcess.once('close', function(m) {
            logger.info("Child channel has closed.");
            process.exit(0);
        });
        childProcess.once('disconnect', function(m) {
            logger.info("Child channel has closed.");
            process.exit(0);
        });
        childProcess.send(msg);
        return deferred.promise;
    });
};
for (var accred in registries) {
    var registry = registries[accred];
    var eppProcess = cp.fork(__dirname + '/worker.js');
    eppProcess.send({
        "registry": registry
    });
    availableProcesses[registry] = eppProcess;

    eppServerWorker(registry, eppProcess);

}
process.on('SIGINT', function() {
    var logoutResponse = function(data) {
        logger.debug("Got reply from logout: ", data);
    };
    for (var registry in availableProcesses) {
        var childProc = availableProcesses[registry];
        childProc.send({
            "command": "logout",
            "data": {"kill": true}
        });
        childProc.once('message', logoutResponse);
    }
    amqpConnection.shutdown();
    process.exit(0);
});

