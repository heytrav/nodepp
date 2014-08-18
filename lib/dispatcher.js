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
                    console.log("In dispatcher. Calling resolved promise handler with response data");
                    process.send(responseData);
                }, function (error){throw new Error(error);
                });
                //currentState.command(command, data, transactionId).then(function(responseData) {
                //}, function (error) {
                //throw new Error(error);
                //});
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
            console.log("Stream initiated, called first promise handler");
            setTimeout(function() {
                var processedLogin = currentState.command('login', {
                    "login": registryConfig.login,
                    "password": registryConfig.password
                },
                loginTransactionId).then(
                    function(data){console.log("Got data: ", data);},
                    function(error) {console.error("getting a fat error: ", error);}
                    );
                console.log("processed login data: ", processedLogin.toString());
            }, 2000);
        });
    }
    this.state = currentState;

};

module.exports = Dispatcher;

