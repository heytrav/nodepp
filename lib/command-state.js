var eppGenerator = require('./epp.js');
var eppConnection = require('./connection.js');
module.exports = function(registry) {
    console.log("Initialising command state with registry: " + registry);
    var epp = eppGenerator(registry);
    var connection = eppConnection(epp.config);
    connection.initStream();

    return {

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
            10000);
        },

        "resultOk": function(result) {
            if (result.status === 'OK') {
                return true;
            }
            return false;
        },

        // actions
        "login": function(credentials, callback) {
            var xml = epp.login(credentials, 'test-1234');
            console.log(xml);
            // send login
            var result = callback(credentials);
            if (this.resultOk(result)) {
                this.connected = true;
                this.idle();
            }
            return result;
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
            var xml = epp.hello();
            console.log(xml);

            this.idle();
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
            if (this.interval && this.state === 'idle') clearInterval(this.interval);

            this.state = 'command';
            try {
                switch (command) {
                case 'login':
                    result = this.login(data, callback);
                    break;
                case 'logout':
                    result = this.logout(callback);
                    break;
                case 'hello':
                    result = this.hello(callback);
                    break;
                case 'checkDomain':
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

