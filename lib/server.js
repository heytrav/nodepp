
var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var program = require('commander');
var ipfilter =  require('ipfilter');
var moment = require('moment');
var events = require('events');
var util  = require('util');

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
var childQueue = [];
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

EventDispatcher = function (){
    events.EventEmitter.call(this);
    this.childFree = function (registry) {
        this.emit('childFree', registry);
    };
    this.queueChild = function (registry) {
        this.emit('queueChild', registry);
    };

};
util.inherits(EventDispatcher, events.EventEmitter);


var eventer =  new EventDispatcher();

function Listener() { }
Listener.prototype.childFree = function(registry) {
    console.info(registry + " free ");
    var childProc = busyProcesses[registry];
    delete busyProcesses[registry];
    availableProcesses[registry] = childProc;
    eventer.queueChild(registry);
};

Listener.prototype.queueChild = function (registry) {
    var childProc = availableProcesses[registry];
    if (childProc && childQueue.length > 0) {
        delete availableProcesses[registry];
        busyProcesses[registry] = childProc;
        var callToChild = childQueue.shift();
        callToChild(childProc);
    }
};

var listener = new Listener();
eventer.on('queueChild', listener.queueChild);
eventer.on('childFree', listener.childFree);

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
            eventer.childFree(registry);
        });
        childProcess.send({
            "command": req.params.command,
            "data": queryData
        });
    };
    childQueue.push(processChild);
    console.info("Items in queue: ", childQueue.length);
    eventer.queueChild(registry);
});

app.listen(program.listen);

