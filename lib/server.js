var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');

var registries = ['hexonet']; //, 'nzrs'];
var eppProcesses = {};
for (var accred in registries) {
    var registry = registries[accred];
    var eppProcess = cp.fork(__dirname + '/worker.js');
    eppProcess.send({
        "registry": registry
    });
    eppProcesses[registry] = eppProcess;
}

var app = express();

app.use(bodyParser.json());

app.post('/command/:command/:registry', function(req, res) {
    //res.set('Content-type', 'application/json');
    if (! (req.params.registry in eppProcesses)) {
        res.send(400, {
            "error": "Unknown registry"
        });
        return;
        //res.end();
    }
    var registry = req.params.registry;
    var childProc = eppProcesses[registry];
    var queryData = req.body;
    console.log("Got request: ", req.body);
    childProc.on('message', function(m) {
        console.log('Getting input from child: ', m);
        //res.write(m);
        res.end(m);
    });
    childProc.send({
        "command": req.params.command,
        "data": queryData
    });
});

process.on('SIGINT', function() {
    for (var registry in eppProcesses) {
        var childProc = eppProcesses[registry];
        childProc.send({
            "command": "logout",
            "data": {}
        });
    }
    process.exit(0);
});

app.listen('3000');

