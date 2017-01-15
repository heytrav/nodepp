var winston = require('winston');
var nconf = require('nconf');

nconf.env()
var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ 
          "level": log_level,
          "json": true
      })
    ]
});

var available;
var busy;
var childQueue = [];
var eventer;
function Listener(eventDispatcher, availableProcesses) {
    eventer = eventDispatcher;
    available = availableProcesses;
    busy = {};
}
Listener.prototype.pushChildQueue = function (child) {
    childQueue.push(child);
    logger.info("Items in queue: ", childQueue.length);
};
Listener.prototype.childFree = function(registry) {
    logger.info(registry + " free ");
    var childProc = busy[registry];
    delete busy[registry];
    available[registry] = childProc;
    eventer.queueChild(registry);
};

Listener.prototype.queueChild = function (registry) {
    var childProc = available[registry];
    if (childProc && childQueue.length > 0) {
        delete available[registry];
        busy[registry] = childProc;
        var callToChild = childQueue.shift();
        callToChild(childProc);
    }
};

module.exports = Listener;
