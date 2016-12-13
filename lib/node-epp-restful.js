var restify = require("restify");
var bodyParser = require("body-parser");
var moment = require('moment');
var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);
var ProtocolState = require('./protocol-state');

logger.debug("Starting epp server.", process.argv);

var appConfig = nconf.get('app-config');
logger.debug("Application config: ", appConfig);
var registries = nconf.get('registries'); // should only be 1.

function Dispatcher(registry) {
    this.registry = registry;
    this.registryConfig = nconf.get('app-config')[registry];
    logger.info("Starting for registry: ", registry);
    logger.info("Using config to contact registrar", this.registryConfig);
    this.state = new ProtocolState(registry, this.registryConfig);

}

Dispatcher.prototype.startEPP = function startLoop() {
    //var currentState = this.state;
    var that = this;

    var registryConfig = this.registryConfig;
    //currentState = new ProtocolState(registry, registryConfig);
    var loginTransactionId = ['login', new Date().getTime(), require('crypto').randomBytes(8).toString('hex')].join('-').toUpperCase();

    // Initialise the connection stream. Upon connection, attempt
    // to login.
    var eppCommand = function() {
        setTimeout(function() {
            that.state.login({
                "login": registryConfig.login,
                "password": registryConfig.password
            },
            loginTransactionId).then(
                function(data) {
                    logger.log("Got login data: ", data.toString());
                    return;
                },
                function(error) {
                    logger.error("Unable to login: ", error);
                    throw new Error(error);
                }
            );
        },
            2000);
    };
    return this.sendMessage(eppCommand)
};

Dispatcher.prototype.sendMessage = function sendMessage(eppCommand) {
    try {
        logger.debug("Calling epp command.");
        return this.state.connection.initStream().then(eppCommand);
    } catch(e) {
        logger.error("Unable to processes EPP request" );
        logger.error(moment().utc().toString() + ": Dispatcher error: ", e);
        this.state = false;
    }
};

Dispatcher.prototype.command = function command(command, data) {
    if (!this.state.loggedIn) {
        if (command === 'logout') {
            logger.warn("Killing child process.");
            process.exit(0);
        } else if (command !== 'login') {
            logger.error("Attempted " + command + " while not logged in.");
            //process.send({"error": "Not logged in."});
            return;
        }
    } else if (command) {
        logger.debug("Sending a " + command);
        var that = this;
        var transactionId = data.transactionId;
        if (!transactionId) {
            transactionId = [command, new Date().getTime(), require('crypto').randomBytes(8).toString('hex')].join('-').toUpperCase();
        }
        var eppCommand = function() {
            that.state.command(command, data, transactionId).then(function(responseData) {
                // Return out of this promise.
                //process.send(responseData);
                return responseData;
            },
            function(error) {
                logger.error("Command returned an error state:", error);
                throw error;
            });
        };
        return this.sendMessage(eppCommand);
    }
};


var dispatcher = new Dispatcher(registries[0]);
dispatcher.startEPP();

var app = restify.createServer();
app.use(bodyParser.json());
var ips = nconf.get('whitelisted_ips');

app.get('/checkDomain/:domain', function(req, res){
    var domain = req.params.domain
    logger.debug("Checking domain " + domain); 
    var data = { "domain": domain };
    var result = dispatcher.command("checkDomain", data)

    logger.debug("Got result:", result);
    res.send(result);
});

app.post('/command/:registry/:command', function(req, res) {
    var registry = req.params.registry;
    var queryData = req.body;

    var a = moment();

    var processChild = function (childProcess) {
        childProcess.once('message', function(m) {
            var b = moment();
            var diff = b.diff(a, 'milliseconds');
            logger.info('Request elapsed time: '+ diff.toString() + ' ms');
            res.send(m);
            eventDispatch.childFree(registry);
        });
        childProcess.send({
            "command": req.params.command,
            "data": queryData
        });
    };
    listener.pushChildQueue(processChild);
    eventDispatch.queueChild(registry);
});
app.listen(nconf.get('listen'));

