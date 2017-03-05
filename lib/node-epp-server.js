var express = require("express");
var bodyParser = require("body-parser");
var cp = require('child_process');
var ipfilter = require('ipfilter');
var moment = require('moment');
var Listener = require('./listener.js');
var EventDispatcher = require('./event-dispatcher.js');
var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);

logger.debug("Starting epp server.", process.argv);

var availableProcesses = {};
var appConfig = nconf.get('app-config');
var registries = nconf.get('registries');
logger.debug("Registries: ", registries);
for (var accred in registries) {
  var registry = registries[accred];
  logger.info("Starting worker for", registry);
  var eppProcess = cp.fork(__dirname + '/worker.js', process.argv.slice(2));
  eppProcess.send({
    "registry": registry
  });
  availableProcesses[registry] = eppProcess;
}
process.on('SIGINT', function() {
  var logoutResponse = function(data) {
    logger.info("Got reply from logout: ", data);
  };
  for (var registry in availableProcesses) {
    var childProc = availableProcesses[registry];
    childProc.send({
      "command": "logout",
      "data": {
        "kill": true
      }
    });
    childProc.once('message', logoutResponse);
  }
  process.exit(0);
});


// Wire up event/listener to keep track of available worker process. This is
// to avoid individual connection workers from getting swamped.
var eventDispatch = new EventDispatcher();
var listener = new Listener(eventDispatch, availableProcesses);
eventDispatch.on('queueChild', listener.queueChild);
eventDispatch.on('childFree', listener.childFree);


var app = express();
app.use(bodyParser.json());
var ips = nconf.get('whitelisted_ips');
app.use(ipfilter(ips, {
  "mode": "allow"
}));

app.post('/command/:registry/:command', function(req, res) {
  var registry = req.params.registry;
  if (!(registry in availableProcesses)) {
    res.send(400, {
      "error": "Unknown registry"
    });
    return;
  }
  var queryData = req.body;

  var a = moment();
  var processChild = function(childProcess) {
    childProcess.once('message', function(m) {
      var b = moment();
      var diff = b.diff(a, 'milliseconds');
      logger.info('Request elapsed time: ' + diff.toString() + ' ms');
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
app.listen(nconf.get('listen'));

