var EppFactory = require('../lib/epp-factory.js');
var ProtocolConnection = require('./connection.js');
var parser = require('xml2json');
var moment = require('moment');
var Q = require('q');

var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);

var currRegistry;
function ProtocolState(registry, config) {
  currRegistry = registry;
  this.epp = EppFactory.generate(registry, config);
  this.connection = new ProtocolConnection(config);
  this.state = "offline";
  this.loggedIn = false;
}

ProtocolState.prototype.idle = function() {
  var self = this;
  this.state = 'idle';
  this.interval = setInterval(function() {
    var now = moment();
    if (!self.last || now.diff(self.last, 'seconds') > 60) {
      logger.debug("It's been 60 seconds, calling hello for " + currRegistry);
      if (self.loggedIn) {
        self.command('hello', null, 'fake').then(function(helloResponse) {
          logger.debug("Hello got response: ", helloResponse.toString());
        },
          function(error) {
            logger.error("Hello got error: ", error);
          });
      } else {
        logger.info("We're logged out, can't send <hello/>");
      }
    }
  },
    5000);
};

ProtocolState.prototype.resultOk = function(result) {
  if (result.status === 'OK') {
    return true;
  }
  return false;
};
ProtocolState.prototype.processResponse = function(eppJson) {
  var eppData = eppJson.epp;
  if (eppData) {
    if (eppData.response) {
      var eppResponse = eppData.response;
      var returnData = {
        "result": eppResponse.result,
        "data": eppResponse.resData,
        "transactionId": eppResponse.trID
      };
      if (eppResponse.hasOwnProperty('msgQ')) {
        returnData.msgQ = eppResponse.msgQ;
      }

      return returnData;
    }
    return eppData;
  }
  return eppJson;
};

ProtocolState.prototype.processReturnedXML = function(returnedXML) {
  var response = parser.toJson(returnedXML, {
    "object": true
  });
  logger.debug(returnedXML.toString());
  var processedResponse = this.processResponse(response);
  if (processedResponse && processedResponse.result) {
    var result = processedResponse.result;
    logger.debug("Processed response", processedResponse);
    return processedResponse;
  }
};

ProtocolState.prototype.login = function(data, transactionId) {
  var self = this;

  return this.command('login', data, transactionId).then(function(data) {
    var result = data.result;

    if (result.hasOwnProperty('code') && result.code < 2000) {
      logger.debug("Logged in successfully.");
      self.loggedIn = true;
    }
    return data;
  },
    function(error) {
      throw new Error(error);
    });
};
ProtocolState.prototype.command = function(command, data, transactionId) {
  var self = this;
  if (this.interval) {
    clearInterval(this.interval);
  }

  this.state = 'command';
  var eppCommand = this.epp[command];
  var xml;
  try {
    if (!eppCommand)
      throw new Error("Unknown EPP command");
    xml = this.epp[command](data, transactionId);
  } catch (e) {
    if (this.state !== 'idle') {
      self.idle();
    }
    throw e;
  }
  // This is a promise
  return this.connection.send(xml).then(function(buffer) {
    self.last = moment();
    if (command !== 'logout') {
      self.idle();
      if (command === 'login') {
        self.loggedIn = true;
      }
    } else {
      self.loggedIn = false;
      logger.info("Logged out.");
      if (data.kill) {
        logger.warn("Logged out and killing child process.");
        process.exit(0);
      }
    }
    return self.processReturnedXML(buffer);
  },
    function(error) {
      logger.error(error);
      self.loggedIn = false;
    });
};

module.exports = ProtocolState;

