var moment = require('moment');
var AMQP = require('amqp-as-promised');

var Dispatcher = require('./dispatcher-es6');
var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);
var processId = process.pid;

var registry = nconf.get('registries')[0];
logger.debug("Environment: ", process.env);
let host = nconf.get("rabbithost") || nconf.get("RABBIT_HOST");
let port = nconf.get("rabbitport") || nconf.get("RABBIT_PORT"); 
let login = nconf.get("rabbitlogin") || nconf.get("RABBIT_USER");
let password = nconf.get("rabbitpassword") || nconf.get("RABBIT_PASSWORD");
let vhost = nconf.get("vhost") || nconf.get("RABBIT_VHOST");

let rabbitConnection = {
    host: host,
    port: port,
    login: login,
    password: password,
    vhost: vhost,
    noDelay: true,
    ssl: {
        enabled: false
    }
};


logger.debug("Initialised with registry ", registry);

let dispatcher = new Dispatcher(registry);
dispatcher.startEpp();

var availableProcesses = {};
logger.debug("Connecting to AMQP server", rabbitConnection);
var amqpConnection = new AMQP(rabbitConnection);
amqpConnection.errorHandler = (error) => {
    logger.error(error);
};
amqpConnection.serve('epp', registry, (incoming, headers, del) =>  {
    var msg = JSON.parse(String.fromCharCode.apply(String, incoming.data))
    let {command, data} = msg;
    var a = moment();
    return dispatcher.command(command, data).then((response) => {
        var b = moment();
        var diff = b.diff(a, 'milliseconds');
        logger.info(command + ' request elapsed time: ' + diff.toString() + ' ms');
        return response;
    }, (error) => {
        logger.error(error);
        return error
    });
});
process.on('SIGINT', () =>  {
    var logoutResponse = (data) => {
        logger.debug("Got reply from logout ", data);
    };
    var data = {
        kill: true
    };

    dispatcher.command('logout', data).then((response) => {
        logger.info('Logged out.');
        return response;
    }, (error) => {
        logger.error(error);
        return error;
    });
    amqpConnection.shutdown();
    process.exit(0);
});

