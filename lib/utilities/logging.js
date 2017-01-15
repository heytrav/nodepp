var winston = require('winston');
var moment = require('moment');

module.exports.getLogger = function(nconf) {
    var log_level = nconf.get('loglevel');
    return new (winston.Logger)({
        transports: [
            new (winston.transports.Console)({ 
                "level": log_level,
                "json": nconf.get('json'),
                "timestamp":  function() {
                    return moment();
                }
            })
        ]
    });
};


