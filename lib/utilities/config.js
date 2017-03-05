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
    }).option('rabbithost', {
        "describe": "RabbitMQ host"
    }).option('rabbitport', {
        "describe": "RabbitMQ port",
        "number": true,
        "default": 5672
    }).option('epp_login', {
      "describe": "EPP login"
    }).option('epp_password', {
      "describe": "EPP password"
    }).option('rabbitlogin', {
        "describe": "Login for rabbitmq"
    }).option('rabbitpassword', {
        "describe": "Password for rabbitmq"
    }).option('vhost',{
        "describe": "vhost for rabbit",
        "default": "/"
    }).help('h').alias('h', 'help')
    .argv;

function readSecretFile(env_var, key, config) {
  let filepath = config.get(env_var);
  try {
    var loginReader = require('readline').createInterface({
      input: require('fs').createReadStream(filepath)
    });
    loginReader.on('line', (line) => {
      config.set(key, line);
    });
  } catch (e) {
    console.error(e);
  }
}
module.exports.getConfig = function(file = "epp-config.json") {
    nconf.overrides(argv).env();
    file = nconf.get('config-file') || file;
    var filePath = path.resolve(file);
    nconf.file(filePath);
    // Read secret files mounted by docker secret.
    readSecretFile('EPP_LOGIN_FILE', 'epp_login', nconf);
    readSecretFile('EPP_PASSWORD_FILE', 'epp_password', nconf);
    return nconf;
};
