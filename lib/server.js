
var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var program = require('commander');
var ipfilter =  require('ipfilter');
var moment = require('moment');
var Listener = require('./listener.js');
var EventDispatcher = require('./event-dispatcher.js');

function collectRegistries(val, registryArgs) {
    registryArgs.push(val);
    return registryArgs;
}

program.version('0.0.1').usage('[options]').option('-r, --registries <registry>', 'Registry', collectRegistries, []).option('-l, --listen <n>', 'Listen on port', parseInt, 3000);
program.parse(process.argv);
var registries = program.registries;
console.log("Initialised with registries: ", registries);
var availableProcesses = {};
var busyProcesses = {};
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



var eventDispatch =  new EventDispatcher();
var listener = new Listener(eventDispatch, availableProcesses);
eventDispatch.on('queueChild', listener.queueChild);
eventDispatch.on('childFree', listener.childFree);

var ips = [
    "127.0.0.1",
    "184.106.92.72",
    "176.58.108.69",
    "67.207.155.39",
    "23.253.42.149",
    "184.106.158.220",
    "50.57.139.187",
    "23.253.37.136",
    "178.79.169.125",
    "50.56.110.14",
    "184.106.170.205"
];

var app = express();
app.use(bodyParser.json());
app.use(ipfilter(ips, {"mode": "allow"}));

app.post('/command/:registry/:command', function(req, res) {
    var registry = req.params.registry;
    if (! (registry in availableProcesses)) {
        res.send(400, {
            "error": "Unknown registry"
        });
        return;
    }
    var queryData = req.body;

    var a = moment();
    var processChild = function (childProcess) {
        childProcess.once('message', function(m) {
            var b = moment();
            var diff = b.diff(a, 'milliseconds');
            console.info('Request elapsed time: '+ diff.toString() + ' ms');
            res.send(m);
            eventDispatch.childFree(registry);
        });
        childProcess.send({
            "command": req.params.command,
            "data": queryData
        });
    };
    listener.pushChildQueue(processChild);
    eventDispatch.queueChild(registry);
});

app.listen(program.listen);

