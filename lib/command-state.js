var eppGenerator = require('./epp.js');
var eppConnection = require('./connection.js');
var parser = require('xml2json');

module.exports = function(registry, config) {
    var epp = eppGenerator(registry, config);
    var connection = eppConnection(config);
    return {
        "connection": connection,
        "state": "offline",
        "idle": function() {
            var self = this;
            this.state = 'idle';
            this.interval = setInterval(function() {
                self.command('hello', null, function() {
                    return {
                        "status": "OK"
                    };
                });
            },
            60000);
        },

        "resultOk": function(result) {
            if (result.status === 'OK') {
                return true;
            }
            return false;
        },

        "processResponse": function(eppJson) {
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
        },
        "command": function(command, data, transactionId, callback) {
            var self = this;
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
                var eppCommand = epp[command];
                if (eppCommand) {
                    if (command === 'hello') {
                        returnCallback = function(returnedXML) {
                            self.idle();
                        };
                    }
                    //console.log("Calling epp command: ", eppCommand);
                    var xml = epp[command](data, transactionId);
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
        },
    };
};

