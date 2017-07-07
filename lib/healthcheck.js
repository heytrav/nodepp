var moment = require('moment');
var nconf = require('./utilities/config').getConfig();
var logger = require('./utilities/logging').getLogger(nconf);
let fs = require('fs')
// Used for error reporting. 
var processId = process.pid;

var registry = nconf.get('registries')[0];
logger.debug("Processing: ", registry)
var sentry_dsn_file = nconf.get("SENTRY_DSN_FILE");
if (sentry_dsn_file) {
    let release = nconf.get("RELEASE_VERSION")
    let environment = nconf.get("SENTRY_ENVIRONMENT")
    logger.debug("Parsing sentry dsn file: ", sentry_dsn_file);
    let sentryDsn = fs.readFileSync(sentry_dsn_file, 'utf8')
      var Raven = require('raven');
      Raven.config(sentryDsn.trim(), {
          release,
          environment,
          extra: {
              registry: registry
          }
      }).install();
    logger.info("Initialising nodepp", {registry, environment, release});
} else {
    logger.warn("Raven not configured.");
}
logger.debug("Environment: ", process.env);
let host = nconf.get("rabbithost") || nconf.get("RABBITMQ_HOST");
let port = nconf.get("rabbitport") || nconf.get("RABBIT_PORT");
let login = nconf.get("rabbitlogin") || nconf.get("RABBITMQ_DEFAULT_USER");
let password = nconf.get("rabbitpassword") || nconf.get("RABBITMQ_DEFAULT_PASS");
let vhost = nconf.get("vhost") || nconf.get("RABBITMQ_DEFAULT_VHOST");

let rabbitConfig = {
  connection: {
    host: host,
    port: port,
    login: login,
    password: password,
    vhost: vhost,
  },
  logLevel: nconf.get('loglevel'),
  waitForConnection: true,
  rpc: {
    timeout: 2000
  }
};

var amqpConnection = require('amqp-as-promised')(rabbitConfig);
amqpConnection.errorHandler = (error) => {
  logger.error("In errorHandler", error);
  process.exit(0);
};
amqpConnection.rpc('epp', registry, JSON.stringify({"command": "hello", "data": {}}), null, {"timeout": 2000}).then((response) => {
    logger.info("Healthcheck ok", response)
    process.exit(0)
}, (error) => {
    logger.error("Healthcheck failed for " + registry)
    process.exit(1)
} )
