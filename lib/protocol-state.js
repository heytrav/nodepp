var EppFactory = require('../lib/epp-factory.js');
var ProtocolConnection = require('./connection.js');
var parser = require('xml2json');
var Q = require('q');

function ProtocolState(registry, config) {
    this.epp = EppFactory.generate(registry, config);
    this.connection = new ProtocolConnection(config);
    this.state = "offline";
    this.loggedIn = false;
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
    var response = parser.toJson(returnedXML, {
        "object": true
    });
    var processedResponse = this.processResponse(response);
    if (processedResponse && processedResponse.result) {
        if (processedResponse.result.code < 2000) { 
            // >= 2000: standard EPP code range for errors
            return processedResponse;
        }
        else {
            throw new Error(processedResponse.result.msg);
        }
    }
};


ProtocolState.prototype.login = function(data, transactionId) {
    var self = this;

    return this.command('login', data, transactionId).then(function(data) {
        self.loggedIn = true;
        return data;
    }, function(error) {
        console.error("Login failed! ", error);
        throw new Error(error);
    });
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
        if (!eppCommand) throw new Error("Unknown EPP command");
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

