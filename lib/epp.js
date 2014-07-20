var convert = require('data2xml')();
var fs, configurationfile;
configurationFile = './lib/epp-config.json';
fs = require('fs');
var configuration = JSON.parse(
        fs.readFileSync(configurationFile)
        );


module.exports = function (registry) {
    return {
        "config": configuration[registry],
        "checkDomain": function(data) {

        },
        "checkContact": function (data) {
        },
        "eppWrapper": function(data ) {

        }
    };
};
