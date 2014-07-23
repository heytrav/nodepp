var eppGenerator = require('./epp.js');
var eppConnection = require('./connection.js');
var parser = require('xml2json');
module.exports = function(registry, config) {
    console.log("Initialising command state with registry: " + registry);
    var epp = eppGenerator(registry, config);
    var connection = eppConnection(config);
    return {
        "connection": connection,
        "state": "offline",
        "connected": false,
        "idle": function() {
            var self = this;
            this.state = 'idle';
            console.log("Called idle");
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
            console.log(xml);
            // send login
            connection.send(xml, function(returnedXML) {

                var response = parser.toJson(returnedXML);

                callback(response);
                self.idle();
            });
            return xml;
        },

        "logout": function(callback) {
            var result = callback();
            if (this.resultOk(result)) {
                this.connected = false;
                if (this.interval) clearInterval(this.interval);
            }
            return result;
        },

        "hello": function() {
            var self = this;
            var xml = epp.hello();
            console.log(xml);
            connection.send(xml, function(returnedXML) {
                var response = parser.toJson(returnedXML);
                console.log("Hello response: ", response);
                self.idle();
            });
        },
        "checkDomain":function (data, callback){
            var self = this;
            var xml = epp.checkDomain(data, 'test-check-1234');
            connection.send(xml, function(returnedXML) {
                var response = parser.toJson(returnedXML);
                callback(response);
                self.idle();
            });
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
        "command": function(command, data, callback) {
            console.log("Calling command: " + command + " data: ", data);
            var result;
            // TODO May have to check that we're not actually executing a
            // 'hello' command when this happens otherwise we could cause
            // a race condition.
            // stop hello loop
            if (this.interval ) {
                console.log("interval exists, clearing it ============");
                 clearInterval(this.interval);
                 this.interval = null;
                console.log(this.interval);
            }

            this.state = 'command';
            var xml;
            try {
                switch (command) {
                case 'login':
                    this.login(data, callback);
                    break;
                case 'logout':
                    this.logout(callback);
                    break;
                case 'hello':
                    this.hello();
                    break;
                case 'checkDomain':
                    this.checkDomain(data, callback);
                    break;
                case 'createDomain':
                case 'infoDomain':
                case 'deleteDomain':
                    result = this.domain_command(command, data, callback);
                    break;

                case 'checkContact':
                case 'infoContact':
                case 'createContact':
                case 'deleteContact':
                    result = this.contact_command(command, data, callback);
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

