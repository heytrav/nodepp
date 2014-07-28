
var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var program = require('commander');

function collectRegistries(val, registryArgs) {
    registryArgs.push(val);
    return registryArgs;
}

program.version('0.0.1').usage('[options]').option('-r, --registries <registry>', 'Registry', collectRegistries, []).option('-l, --listen <n>', 'Listen on port', parseInt, 3000);
program.parse(process.argv);
var registries = program.registries;
console.log("Initialised with registries: ", registries);
var eppProcesses = {};
for (var accred in registries) {
    var registry = registries[accred];
    var eppProcess = cp.fork(__dirname + '/worker.js');
    eppProcess.send({
        "registry": registry
    });
    eppProcesses[registry] = eppProcess;
}
process.on('SIGINT', function() {
    var logoutResponse = function(data) {
        console.log("Got reply from logout: ", data);
    };
    for (var registry in eppProcesses) {
        var childProc = eppProcesses[registry];
        childProc.send({
            "command": "logout",
            "data": {}
        });
        childProc.on('message', logoutResponse);
    }
    process.exit(0);
});

var app = express();

app.use(bodyParser.json());

app.post('/command/:registry/:command', function(req, res) {
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
    childProc.on('message', function(m) {
        //res.write(m);
        res.end(m);
    });
    childProc.send({
        "command": req.params.command,
        "data": queryData
    });
});

app.listen(program.listen);

