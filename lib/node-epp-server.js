var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var program = require('commander');
var ipfilter =  require('ipfilter');
var moment = require('moment');
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
            var client = cp.fork(__dirname + '/worker.js');
            client.once('message', function(loggedIn) {
                if (!loggedIn) {
                    client.kill();
                    return callback("Login failed.", null);
                }
                // parameter order: err, resource
                callback(null, client);
            });
            client.send({
                "registry": registry
            });
        },
        destroy: function(client) {
            setTimeout(function() {
                client.kill();
            }, 2000);
            client.send({
                "command": "logout",
                "data": {"kill": true}
            });
        },
        validateAsync: function(client, callback) {
            if (!client.connected) {
                return callback(false);
            }
            return callback(true);
        },
        returnToHead: true,
        max      : registryConfig['connections'][1],
        min      : registryConfig['connections'][0],
        // specifies how long a resource can stay idle in pool before being removed
        idleTimeoutMillis : 30000,
         // if true, logs via console.log - can also be a function
        log : true
    });
    availableProcesses[registry] = pool;
}

// Wire up event/listener to keep track of available worker process. This is
// to avoid individual connection workers from getting swamped.
var app = express();
app.use(bodyParser.json());
var ips = nconf.get('whitelisted_ips');
app.use(ipfilter(ips, {"mode": "allow"}));

app.post('/command/:registry/:command', function(req, res) {
    var registry = req.params.registry;
    if (!(registry in availableProcesses)) {
        res.status(400).send({
            "error": "Unknown registry"
        });
        return;
    }

    var queryData = req.body;
    var pool = availableProcesses[registry];
    pool.acquire(function(err, client) {
        if (err) {
            logger.error(err);
            res.status(400).send({
                "error": "Session overload"
            });
            return;
        }

        var registryConfig = nconf.get('registries')[registry];
        var t = setTimeout(function() {
            pool.destroy(client);
            res.status(400).send({
                "error": "Timeout"
            });
            return;
        }, registryConfig['max_runtime']);

        var a = moment();
        client.once('message', function(m) {
            clearTimeout(t);
            var b = moment();
            var diff = b.diff(a, 'milliseconds');
            logger.info('Request elapsed time: '+ diff.toString() + ' ms');
            m['runtime'] = diff/1000;
            pool.release(client);
            res.send(m);
        });

        client.send({
            "command": req.params.command,
            "data": queryData
        });
    });
});

process.on('SIGINT', function(err) {
    if (err) {
        console.log(err.stack);
    }

    for (var registry in availableProcesses) {
        var pool = availableProcesses[registry];
        pool.drain(function() {
            pool.destroyAllNow();
        });
    }

    setTimeout(function() {
        process.exit(0);
    }, 5000);
});

process.on('uncaughtException', function(err) {
    console.error(err);
    console.error(err.stack);
});
process.stdin.resume(); //so the program will not close instantly

app.listen(program.listen);
