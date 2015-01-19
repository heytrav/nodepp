var ProtocolState = require('./protocol-state.js'),
nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
});
var moment = require('moment');
function Dispatcher() {

}

Dispatcher.prototype.processMessage = function processMessage(m) {
    var currentState = this.state;
    var eppCommand;

    if (currentState) {
        var command = m.command;
        var data = m.data;
        if (!currentState.loggedIn) {
            if (command === 'logout') {
                console.warn("Killing child process.");
                process.exit(0);
            } else if (command !== 'login') {
                console.error("Attempted " + command + " while not logged in.");
                process.send({"error": "Not logged in."});
            }
        } else if (command) {
            var transactionId = data.transactionId;
            if (!transactionId) {
                transactionId = [command, moment().unix()].join('-');
            }
            eppCommand = function() {
                currentState.command(command, data, transactionId).then(function(responseData) {
                    process.send(responseData);
                },
                function(error) {
                    throw error;
                });
            };
        }
    } else { // Initialise a connection instance with registry configuration.
        var registry = m.registry;
        var registryConfig = nconf.get('registries')[registry];
        currentState = new ProtocolState(registry, registryConfig);
        var loginTransactionId = ['login', moment().unix()].join('-');

        // Initialise the connection stream. Upon connection, attempt
        // to login.
        eppCommand = function() {
            setTimeout(function() {
                currentState.login({
                    "login": registryConfig.login,
                    "password": registryConfig.password
                },
                loginTransactionId).then(
                    function(data) {
                        console.log("Got login data: ", data.toString());
                    },
                    function(error) {
                        console.error("Unable to login: ", error);
                    });
            },
            2000);
        };
    }
    try {
        currentState.connection.initStream().then(eppCommand);
    } catch(e) {
        console.error(moment().utc().toString() + ": Dispatcher error: ", e);
        process.send({
            "msg": "Unable to processes EPP request"
        });
        this.state = false;
    }
    this.state = currentState;
};

module.exports = Dispatcher;
