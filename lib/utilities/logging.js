var winston = require('winston');
var moment = require('moment');
let fs = require('fs')

function getLogger(nconf) {
  var log_level = nconf.get('loglevel');
  var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({
        "level": log_level,
        "json": nconf.get('json'),
        "timestamp": function() {
          return moment();
        }
      })
    ]
  });
  var logzioTokenFile = nconf.get("LOGZIO_TOKEN_FILE");
  if (logzioTokenFile) {
    let logzioToken = fs.readFileSync(logzioTokenFile, 'utf8').trim()
    var logzioWinstonTransport = require('winston-logzio');
    var loggerOptions = {
        token: logzioToken,
        host: 'listener.logz.io',
    };
    logger.add(logzioWinstonTransport, loggerOptions);
  }
  return logger
}
module.exports.getLogger = getLogger; 
