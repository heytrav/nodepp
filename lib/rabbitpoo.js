var AMQP = require('amqp-as-promised');


nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
});
var rabbitmqConfig = nconf.get('rabbitmq');
var amqpConnection = new AMQP(rabbitmqConfig.connection);
var msg = {
    "command": "checkDomain",
    "data": {
        "name": "iwmn-test-domain.com"
    }
};

amqpConnection.rpc('epp', 'eppServer.hexonet-test1', msg).then(function(data) {
    console.log("Got data in response: ", data);
    return data;
});
