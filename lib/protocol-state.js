var EppFactory = require('../lib/epp-factory.js');
var ProtocolConnection = require('./connection.js');
var parser = require('xml2json');
var Q = require('q');

function ProtocolState(registry, config) {
    this.epp = EppFactory.generate(registry, config);
    this.connection = new ProtocolConnection(config);
    this.state = "offline";
}

ProtocolState.prototype.idle = function() {
    var self = this;
    this.state = 'idle';
    this.interval = setInterval(function() {
        self.command('hello', null, 'fake', function() {
            return {
                "status": "OK"
            };
        });
    },
    60000);
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

            return returnData;
        }
        return eppData;
    }
    return eppJson;
};

ProtocolState.prototype.processReturnedXML = function(returnedXML) {
    var deferred = Q.defer();
    var response = parser.toJson(returnedXML, {
        "object": true
    });
    var processedResponse;
    self.idle();
    try {
        processedResponse = self.processResponse(response);

    } catch(e) {
        deferred.reject(e);
    }
    //callback(processedResponse);
    deferred.resolve(processedResponse);
    return deferred.promise;
};

ProtocolState.prototype.command = function(command, data, transactionId, callback) {
    var self = this;
    //if (!transactionId || typeof(transactionId) !== 'string') {
    //throw new Error("No transactionId provided");
    //}
    //if (!callback || typeof(callback) !== 'function') {
    //throw new Error("Return callback must be a function.");
    //}
    // TODO check to see if this does anything useful
    if (this.interval) {
        clearInterval(this.interval);
    }

    this.state = 'command';
    var eppCommand = this.epp[command];
    var xml;
    try {
        if (!eppCommand) {
            throw new Error("Unknown EPP command");
        }
        //else if (command === 'hello') {
        //returnCallback = function(returnedXML) {
        //self.idle();
        //};
        //}
        xml = this.epp[command](data, transactionId);
    } catch(e) {
        var error = {
            "msg": "Unable to complete EPP request.",
            "error": e
        };
        if (callback && this.state !== 'idle') {
            callback(JSON.stringify(error));
            self.idle();
        }
        console.error("Encountered an error: ", e);
    }
    this.connection.send(xml).then(returnCallback);
};

module.exports = ProtocolState;

