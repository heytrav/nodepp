cp = require('child_process');
amqp = require('amqp');
nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
});
var rabbitmqConfig = nconf.get('rabbitmq');
var chai = require('chai');
//var chaiAsPromised = require('chai-as-promised');
//chai.use(chaiAsPromised);
var expect = chai.expect,
should = chai.should;

describe('EPP worker process control', function() {
    var amqpConnection, exchange, eppQueue, backendQueue;
    var registries = ["hexonet-test1"];
    before(function(done) {
        amqpConnection = amqp.createConnection(rabbitmqConfig.connection);
        amqpConnection.on('ready', function() {
            exchange = amqpConnection.exchange('eppTest');
            exchange.on('open', function() {
                done();
            });
        });
    });
    before(function(done) {
        eppQueue = amqpConnection.queue('eppQueue', function(queue) {
            eppQueue.bind(exchange, 'test-epp');
            done();
        });
    });
    it('should pass a message from a producer to a consumer', function(done) {
        eppQueue.subscribe(function(msg) {
            try {
                expect(msg.command).to.equal('checkDomain');
                done();
            } catch(e) {
                done(e);
            }
        });
        exchange.publish('test-epp', {
            "command": "checkDomain",
            "data": {
                "name": "test-domain.com"
            }
        });

    });

});

