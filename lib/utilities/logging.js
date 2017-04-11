var winston = require('winston');
var moment = require('moment');
var getSecret = require('./docker-secrets').getDockerSecret;

function getLogger(nconf) {
  var log_level = nconf.get('loglevel');
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        "log_level": log_level,
        "json": nconf.get('json'),
        "timestamp": function() {
          return moment();
        }
      })
    ]
  });
  var logzio_token_file = nconf.get("LOGZIO_TOKEN_FILE");
  if (logzio_token_file) {
    getSecret(logzio_token_file, (line) => {
      var logzioWinstonTransport = require('winston-logzio');
      var loggerOptions = {
          token: line.trim(),
          host: 'listener.logz.io',
      };
      logger.add(logzioWinstonTransport, loggerOptions);
    })
  }
  return logger
}
module.exports.getLogger = getLogger; 
