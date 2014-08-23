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

    if (currentState) {
        if (m.command) {
            var command = m.command;
            var data = m.data;
            var transactionId = data.transactionId;
            if (!transactionId) {
                transactionId = ['iwmn', moment().unix()].join('-');
            }
            try {
                currentState.command(command, data, transactionId).then(function(responseData) {
                    process.send(responseData);
                },
                function(error) {
                    throw error;
                });
            } catch(e) {
                console.error(moment().utc().toString() + ": Dispatcher error: ", e);
                process.send({
                    "msg": "Unable to processes EPP request"
                });
                this.state = false;
            }
        }
    }
    else { // Initialise a connection instance with registry configuration.
        var registry = m.registry;
        var registryConfig = nconf.get('registries')[registry];
        currentState = new ProtocolState(registry, registryConfig);
        var loginTransactionId = ['iwmn', 'login', moment().unix()].join('-');

        // Initialise the connection stream. Upon connection, attempt
        // to login.
        currentState.connection.initStream().then(function() {
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
        });
    }
    this.state = currentState;

};

module.exports = Dispatcher;

