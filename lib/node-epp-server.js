var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var program = require('commander');
var ipfilter =  require('ipfilter');
var moment = require('moment');
var Listener = require('./listener.js');
var path = require('path');
var nconf = require('nconf');
var winston = require('winston');
var Pool = require('generic-pool').Pool;

nconf.env().file({
    "file": path.resolve(__dirname, '..', 'config/epp-config.json')
});
var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ level: log_level })
    ]
});

function collectRegistries(val, registryArgs) {
    registryArgs.push(val);
    return registryArgs;
}

// Read command-line arguments.
program.version('0.0.1').usage('[options]').option('-r, --registries <registry>', 'Registry', collectRegistries, []).option('-l, --listen <n>', 'Listen on port', parseInt, 3000);
program.parse(process.argv);

var registries = program.registries;
logger.log("Initialised with registries: ", registries);

var availableProcesses = {};
for (var accred in registries) {
    var registry = registries[accred];
    var registryConfig = nconf.get('registries')[registry];
    var pool = new Pool({
        name     : registry,
        create   : function(callback) {
            var eppProcess = cp.fork(__dirname + '/worker.js');
            eppProcess.send({
                "registry": registry
            });

            // parameter order: err, resource
            callback(null, eppProcess);
        },
        destroy  : function(client) {
            logger.log("Logout.");
            client.send({
                "command": "logout",
                "data": {"kill": true}
            });
            client.once('message', function(data) {
                logger.log(registry + ": Got reply from logout: ", data);
            })
        },
        max      : registryConfig['connections'][1],
        // optional. if you set this, make sure to drain() (see step 3)
        min      : registryConfig['connections'][0],
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis : 30000,
         // if true, logs via console.log - can also be a function
        log : true
    });
    availableProcesses[registry] = pool;
}

process.on('SIGINT', function(err) {
    if (err) {
        console.log(err.stack);
    }
    for (var registry in availableProcesses) {
        var pool = availableProcesses[registry];
        pool.drain(function() {
            pool.destroyAllNow();
            process.exit(0);
        });
    }
});

// Wire up event/listener to keep track of available worker process. This is
// to avoid individual connection workers from getting swamped.
var app = express();
app.use(bodyParser.json());
var ips = nconf.get('whitelisted_ips');
app.use(ipfilter(ips, {"mode": "allow"}));

app.post('/command/:registry/:command', function(req, res) {
    var registry = req.params.registry;
    if (!(registry in availableProcesses)) {
        res.send(400, {
            "error": "Unknown registry"
        });
        return;
    }

    var queryData = req.body;
    var pool = availableProcesses[registry];
    pool.acquire(function(err, client) {
        if (err) {
            logger.error(err);
            res.send(400, {
                "error": "Session overload"
            });
            return;
        }
        var a = moment();
        client.once('message', function(m) {
            var b = moment();
            var diff = b.diff(a, 'milliseconds');
            logger.info('Request elapsed time: '+ diff.toString() + ' ms');
            m['runtime'] = diff/1000;
            res.send(m);
            pool.release(client);
        });

        client.send({
            "command": req.params.command,
            "data": queryData
        });
    });
});

app.listen(program.listen);

process.stdin.resume();//so the program will not close instantly
