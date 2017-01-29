var moment = require('moment');
var AMQP = require('amqp-as-promised');

var Dispatcher = require('./dispatcher-es6');
var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);
var processId = process.pid;

var registry = nconf.get('registries')[0];

let rabbitConnection = {
    host: nconf.get("rabbithost"),
    port: nconf.get("rabbitport"),
    login: nconf.get("rabbitlogin"),
    password: nconf.get("rabbitpassword"),
    vhost: nconf.get("vhost"),
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

