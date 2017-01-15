var ProtocolState = require('./protocol-state.js');
var moment = require('moment');

var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);


function Dispatcher() {

}

Dispatcher.prototype.processMessage = function processMessage(m) {
    var currentState = this.state;
    var eppCommand;

    if (currentState && currentState.connection && currentState.connection.stream) {
        var command = m.command;
        var data = m.data;
        if (!currentState.loggedIn) {
            if (command === 'logout') {
                logger.warn("Killing child process.");
                process.exit(0);
            } else if (command !== 'login') {
                logger.error("Attempted " + command + " while not logged in.");
                process.send({"error": "Not logged in."});
                return;
            }
        } else if (command) {
            var transactionId = data.transactionId;
            if (!transactionId) {
                transactionId = [command, new Date().getTime(), require('crypto').randomBytes(8).toString('hex')].join('-').toUpperCase();
            }
            eppCommand = function() {
                currentState.command(command, data, transactionId).then(function(responseData) {
                    process.send(responseData);
                },
                function(error) {
                    logger.error("Command returned an error state:", error);
                    throw error;
                });
            };
        }
    } else { // Initialise a connection instance with registry configuration.
        var registry = m.registry;
        logger.info("Starting for registry: ", registry);
        var registryConfig = nconf.get('app-config')[registry];
        logger.info("Using config to contact registrar", registryConfig);
        currentState = new ProtocolState(registry, registryConfig);
        var loginTransactionId = ['login', new Date().getTime(), require('crypto').randomBytes(8).toString('hex')].join('-').toUpperCase();

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
                        logger.log("Got login data: ", data.toString());
                    },
                    function(error) {
                        logger.error("Unable to login: ", error);
                    });
            },
            2000);
        };
    }
    try {
        logger.debug("Calling epp command.");
        currentState.connection.initStream().then(eppCommand);
    } catch(e) {
        logger.error(moment().utc().toString() + ": Dispatcher error: ", e);
        process.send({
            "msg": "Unable to processes EPP request"
        });
        this.state = false;
    }
    this.state = currentState;
};

module.exports = Dispatcher;
