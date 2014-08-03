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

        // actions
        "login": function(data, callback) {
            var self = this;
            var xml = epp.login(data, 'test-1234');
            //console.log(xml);
            // send login
            this.connection.send(xml, callback);
            return xml;
        },

        "logout": function(callback) {
            var self = this;
            var xml = epp.logout('test-1234');
            console.log(xml);
            // send login
            this.connection.send(xml, callback);
            return xml;
        },

        "hello": function() {
            var self = this;
            var xml = epp.hello();
            console.log(xml);
            this.connection.send(xml, function(returnedXML) {
                var response = parser.toJson(returnedXML);
                self.idle();
            });
        },

        "createContact": function(data, callback) {
            var self = this;
            var xml = epp.createContact(data, 'test-check-1234');
            this.connection.send(xml, callback);
        },
        "checkContact": function(data, callback) {
            var self = this;
            var xml = epp.checkContact(data, 'test-check-1234');
            this.connection.send(xml, callback);
        },
        "infoContact": function(data, callback) {
            var self = this;
            var xml = epp.infoContact(data, 'test-info-1234');
            this.connection.send(xml, callback);
        },
        "checkDomain": function(data, callback) {
            var self = this;
            var xml = epp.checkDomain(data, 'test-check-1234');
            this.connection.send(xml, callback);
        },
        "createDomain": function(data, callback) {
            var self = this;
            var xml = epp.createDomain(data, 'test-create-1234');
            this.connection.send(xml, callback);
        },
        "infoDomain": function(data, callback) {
            var self = this;
            var xml = epp.infoDomain(data, 'test-info-1234');
            this.connection.send(xml, callback);
        },

        "domain_command": function(command, data, callback) {
            console.log("Executing a " + command + " with: ", data);
            var result = callback();
            this.idle();
            return result;
        },
        "contact_command": function(command, data, callback) {
            console.log("Executing a " + command + " with: ", data);
            var result = callback();
            this.idle();
            return result;
        },
        "processResponse": function (eppJson) {
            console.log("Processing response: ", eppJson);
            var eppData = eppJson.epp;
            console.log("eppData is: ", eppData);
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
        "command": function(command, data, callback) {
            var self = this;
            var result;
            // TODO May have to check that we're not actually executing a
            // 'hello' command when this happens otherwise we could cause
            // a race condition.
            // stop hello loop
            if (this.interval) {
                clearInterval(this.interval);
            }

            // standard callbacks for all responses
            var returnCallback = function(returnedXML) {
                var response = parser.toJson(returnedXML, {"object": true});
                var processedResponse = self.processResponse(response);

                callback(processedResponse);
                self.idle();
            };

            this.state = 'command';
            var xml;
            try {
                switch (command) {
                case 'login':
                    this.login(data, returnCallback);
                    break;
                case 'logout':
                    this.logout(returnCallback);
                    break;
                case 'hello':
                    this.hello();
                    break;
                case 'checkDomain':
                    this.checkDomain(data, returnCallback);
                    break;
                case 'createDomain':
                    this.createDomain(data, returnCallback);
                    break;
                case 'infoDomain':
                case 'deleteDomain':
                    result = this.domain_command(command, data, returnCallback);
                    break;

                case 'checkContact':
                case 'infoContact':
                case 'createContact':
                    this.createContact(data, returnCallback);
                    break;
                case 'deleteContact':
                    result = this.contact_command(command, data, returnCallback);
                    break;
                default:
                    console.log("Unknown command: " + command);
                }

            } catch(e) {
                console.log("Encountered an error: ", e);
            }
            return result;
        },

    };
};

