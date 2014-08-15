cp = require('child_process');
amqp = require('amqp');
nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
});
var rabbitmqConfig = nconf.get('rabbitmq');
var chai = require('chai');
var expect = chai.expect,
should = chai.should;

describe('EPP worker process control', function() {
    var amqpConnection, exchange, eppQueue, backendQueue;
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
    before(function(done){
        backendQueue = amqpConnection.queue('eppResponse', function(queue) {
            backendQueue.bind(exchange, 'test-epp2');
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

    it('should pass a message to another consumer', function(done) {
        backendQueue.subscribe(function(msg) {
            try {
                console.log("Got msg: ",msg);
                done();
            }
            catch (e) {
                done(e);
            }
        });
        exchange.publish('test-epp2', {
            "testResponse":"successful"
        });
    });
});

