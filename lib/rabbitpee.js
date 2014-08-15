cp = require('child_process');
program = require('commander');
amqp = require('amqp');

nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
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
for (var accred in registries) {
    var registry = registries[accred];
    var eppProcess = cp.fork(__dirname + '/worker.js');
    eppProcess.send({
        "registry": registry
    });
    availableProcesses[registry] = eppProcess;
}
process.on('SIGINT', function() {
    var logoutResponse = function(data) {
        console.log("Got reply from logout: ", data);
    };
    for (var registry in availableProcesses) {
        var childProc = availableProcesses[registry];
        childProc.send({
            "command": "logout",
            "data": {}
        });
        childProc.once('message', logoutResponse);
    }
    process.exit(0);
});
var amqpConnection = amqp.createConnection(rabbitmqConfig.connection);
var queueFunction = function(queue) {
    console.log("Queue " + queue.name + " is ready ");
};
var queueMessage = function(msg) {
    console.log("Message received:", msg);
    console.log("Queue object: ", this);
};

amqpConnection.on('ready', function() {
    var exchange = amqpConnection.exchange('amqepp', {"type": "direct"}, function () {
        for (var i in registries) {
            var registry = registries[i];
            var q = amqpConnection.queue('eppQueue', queueFunction);
            q.bind(exchange, registry);
            q.subsribe(queueMessage);
        }
    });
});
