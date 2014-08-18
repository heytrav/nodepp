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
        self.command('hello', null, 'fake').then(function(helloResponse) {
            console.log("Hello got response: ", helloResponse.toString());
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
    console.log("Calling processResponse");
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
    console.log("Called processReturnXML in resolved state", returnedXML.toString());
    var response = parser.toJson(returnedXML, {
        "object": true
    });
    this.idle();
    var processedResponse = this.processResponse(response);
    return processedResponse;
};

ProtocolState.prototype.command = function(command, data, transactionId) {
    var self = this;
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
        xml = this.epp[command](data, transactionId);
    } catch(e) {
        var error = {
            "msg": "Unable to complete EPP request.",
            "error": e
        };
        if (this.state !== 'idle') {
            self.idle();
        }
        console.error("Encountered an error: ", e);
        throw new Error(error);
    }
    // This is a promise
    return this.connection.send(xml).then( function (buffer) { 
        return self.processReturnedXML(buffer); 
    }, 
    function (error) { console.error("error handler got something: ",error); });
};

module.exports = ProtocolState;

