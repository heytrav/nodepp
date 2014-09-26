var cp = require('child_process');
var program = require('commander');
var moment = require('moment');
var AMQP = require('amqp-as-promised');
var Q = require('q');
var path = require('path');

nconf = require('nconf');
nconf.env().file({
    "file": path.resolve(__dirname, '..', 'config/epp-config.json')
});
var rabbitmqConfig = nconf.get('rabbitmq');

function collectRegistries(val, registryArgs) {
    registryArgs.push(val);
    return registryArgs;
}

// Read command-line arguments.
program.version('0.0.1').usage('[options]').option('-r, --registries <registry>', 'Registry', collectRegistries, []);
program.parse(process.argv);

var registries = program.registries;
console.log("Initialised with registries: ", registries);

var availableProcesses = {};

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
            console.info(command + ' request elapsed time: ' + diff.toString() + ' ms');
            deferred.resolve(m);
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
        console.log("Got reply from logout: ", data);
    };
    for (var registry in availableProcesses) {
        var childProc = availableProcesses[registry];
        childProc.send({
            "command": "logout",
            "data": {"child": true}
        });
        childProc.once('message', logoutResponse);
    }
    amqpConnection.shutdown();
    process.exit(0);
});

