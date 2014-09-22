var AMQP = require('amqp-as-promised');
var moment = require('moment');
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
var a = moment();

amqpConnection.rpc('epp', 'eppServer.hexonet-test1', msg, null, {"timeout": 4000}).then(function(data) {
    var b = moment();
    console.log("elapsed time: ", b.diff(a, 'milliseconds'));
    console.log("Got data in response: ", data);
    amqpConnection.shutdown();
    return data;
});
