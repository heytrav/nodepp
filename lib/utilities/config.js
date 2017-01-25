var nconf = require('nconf');
var path = require('path');
var argv = require('yargs')
    .option('app-config', {
        "alias": "a",
        "describe": "Configure EPP with JSON string",
        "string": true
    }).coerce('app-config', JSON.parse)
    .option("registries", {
        "alias": "r",
        "describe": "List of domain registries",
        "array": true
    })
    .option("listen",{
        "alias": "l",
        "describe": "listen",
        "default": 3000,
        "number": true
    }).option( "json", {
        "alias": "j",
        "describe": "JSON formatted logs",
        "default": false
    }).option('config-file', {
        "alias": "f",
        "describe": "Path to JSON config file"
    }).option('loglevel', {
        "describe": "Log level",
        "default": "info"
    }).help('h').alias('h', 'help')
    .argv;

module.exports.getConfig = function(file = "epp-config.json") {
    nconf.overrides(argv).env();
    file = nconf.get('config-file') || file;
    var filePath = path.resolve(__dirname, '../../config', file);
    nconf.file(filePath);
    return nconf;
};
