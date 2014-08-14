var DispatcherState = require('./protocol-state.js'),
nconf = require('nconf');
nconf.env().file({
    "file": "./lib/epp-config.json"
});
var moment = require('moment');
function Dispatcher() {

}


Dispatcher.prototype.processMessage = function processMessage(m) {
    var currentState = this.state;
    try {
        if (currentState) {
            if (m.command) {
                var command = m.command;
                var data = m.data;
                var transactionId = data.transactionId;
                if (!transactionId) {
                    transactionId = ['iwmn', moment().unix()].join('-');
                }
                currentState.command(command, data, transactionId, function(responseData) {
                    process.send(responseData);
                });
            }
        }
        else { // Initialise a connection instance with registry configuration.
            var registry = m.registry;
            var registryConfig = nconf.get('registries')[registry];
            currentState = new DispatcherState(registry, registryConfig);
            var loginTransactionId = ['iwmn', 'login', moment().unix()].join('-');

            // Initialise the connection stream. Upon connection, attempt
            // to login.
            currentState.connection.initStream(function() {
                console.log("Got connection");
                setTimeout(function() {
                    currentState.command('login', {
                        "login": registryConfig.login,
                        "password": registryConfig.password
                    },
                    loginTransactionId, function(data) {
                        console.log("Log in callback received: ", data);
                    });
                },
                2000);
            });
            this.state = currentState;
        }
    } catch (e) {
        console.error(moment().utc().toString() + ": Dispatcher error: ", e);
        this.state = false;
    }
};

module.exports = Dispatcher;

