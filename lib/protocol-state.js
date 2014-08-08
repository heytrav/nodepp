var EPP = require('./epp.js');
var ProtocolConnection = require('./connection.js');
var parser = require('xml2json');

function ProtocolState(registry, config) {
    this.epp = new EPP(registry, config);
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
        var eppResponse = eppData.response;
        var returnData = {
            "result": eppResponse.result,
            "data": eppResponse.resData,
            "transactionId": eppResponse.trID
        };
        return JSON.stringify(returnData);
    }
    return JSON.stringify(eppJson);
};

ProtocolState.prototype.command = function(command, data, transactionId, callback) {
    var self = this;
    if (!transactionId || typeof(transactionId) !== 'string') {
        throw new Error("No transactionId provided");
    }
    if (!callback || typeof(callback) !== 'function') {
        throw new Error("Return callback must be a function.");
    }
    if (this.interval) {
        clearInterval(this.interval);
    }

    // standard callbacks for all responses
    var returnCallback = function(returnedXML) {
        var response = parser.toJson(returnedXML, {
            "object": true
        });
        var processedResponse = self.processResponse(response);
        callback(processedResponse);
        self.idle();
    };

    this.state = 'command';
    try {
        var eppCommand = this.epp[command];
        if (eppCommand) {
            if (command === 'hello') {
                returnCallback = function(returnedXML) {
                    self.idle();
                };
            }
            //console.log("Calling epp command: ", eppCommand);
            var xml = this.epp[command](data, transactionId);
            this.connection.send(xml, returnCallback);

        } else {
            throw new Error('Unknown EPP command');
        }
    } catch(e) {
        var error = {
            "msg": "Unable to complete EPP request.",
            "error": e
        };
        if (callback && this.state !== 'idle') {
            callback(JSON.stringify(error));
            self.idle();
        }
        console.log("Encountered an error: ", e);
    }
};
module.exports = ProtocolState;

