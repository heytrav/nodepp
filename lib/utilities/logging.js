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
        "stringify": true,
        "timestamp": function() {
          return moment();
        }
      })
    ]
  });
  return logger
}
module.exports.getLogger = getLogger; 
