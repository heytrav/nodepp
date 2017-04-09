
var ProtocolState = require('./protocol-state');

var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);

class Dispatcher {
  constructor(registry) {
    this.registry = registry;
    this.registryConfig = nconf.get('app-config')[registry];
    logger.info("Starting dispatcher", {registry, "config": this.registryConfig});
    this.state = new ProtocolState(registry, this.registryConfig);
  }

  startEpp() {
    var that = this;

    var registryConfig = this.registryConfig;
    //currentState = new ProtocolState(registry, registryConfig);
    var loginTransactionId = ['login', new Date().getTime(), require('crypto').randomBytes(8).toString('hex')].join('-').toUpperCase();

    // Initialise the connection stream. Upon connection, attempt
    // to login.
    var eppCommand = () => {
      setTimeout(() => {
        this.state.login({
          "login": nconf.get('epp_login'),
          "password": nconf.get('epp_password')
        },
          loginTransactionId).then(
          function(data) {
            logger.info("login data", {data});
            return;
          },
          function(error) {
            logger.error("Unable to log in", {error});
            throw new Error(error);
          }
        );
      }, 2000);
    };
    return this.sendMessage(eppCommand)
  }

  sendMessage(eppCommand) {
    try {
      logger.debug("Calling epp command.");
      return this.state.connection.initStream().then(eppCommand);
    } catch (e) {
      logger.error("Unable to processes EPP request");
      logger.error(moment().utc().toString() + ": Dispatcher error: ", e);
      this.state = false;
    }
  }

  command(command, data) {
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
      var eppCommand = () => {
        return this.state.command(command, data, transactionId);
      };
      return this.sendMessage(eppCommand);
    }
  }
}

module.exports = Dispatcher;
