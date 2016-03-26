var Amqp = require('amqp-as-promised');
nconf = require('nconf');
var path = require('path');
nconf.env().file({
    "file": path.resolve(__dirname, '..', 'config/epp-config.json')
});
var uuid = require('node-uuid');
var Q = require('q');
var rabbitmqConfig = nconf.get('rabbitmq');
var chai = require('chai');
var expect = chai.expect,
should = chai.should;

describe.skip('RabbitMQ operation', function() {
    var amqpConnection, exchange;
    before(function(done) {
        amqpConnection = new Amqp(rabbitmqConfig.connection);
        amqpConnection.exchange('eppTest', {
            "passive": false
        }).then(function(ex) {
            exchange = ex;
            done();
        });
    });
    describe('test one-way queues', function() {
        var eppQueue, backendQueue;
        before(function(done) {
            amqpConnection.queue('eppQueue', {
                "durable": false
            }).then(function(queue) {
                eppQueue = queue;
                eppQueue.bind(exchange, 'test-epp');
                done();
            });
        });
        before(function(done) {
            amqpConnection.queue('eppResponse', {
                "durable": false
            }).then(function(queue) {
                backendQueue = queue;
                backendQueue.bind(exchange, 'test-epp2');
                done();
            });
        });
        it('should send multiple commands', function(done) {
            var counter = 1;
            eppQueue.subscribe({
                "ack": true
            },
            function(msg, headers, deliveryInfo, messageObject) {
                try {
                    expect(msg.command).to.equal('checkDomain');
                    if (counter == 1) expect(msg.data).to.have.deep.property('name', 'test-1-domain.com');
                    else expect(msg.data).to.have.deep.property('name', 'test-2-domain.com');

                    messageObject.acknowledge(true);
                    if (counter == 2) {
                        done();
                    }
                    counter = counter + 1;
                } catch(e) {
                    done(e);
                }
            });
            exchange.publish('test-epp', {
                "command": "checkDomain",
                "data": {
                    "name": "test-1-domain.com"
                }
            });
            exchange.publish('test-epp', {
                "command": "checkDomain",
                "data": {
                    "name": "test-2-domain.com"
                }
            });
        });

        it('should pass a message to another consumer', function(done) {
            backendQueue.subscribe({
                "ack": true
            },
            function(msg) {
                try {
                    expect(msg.testResponse).to.equal('successful');
                    done();
                }
                catch(e) {
                    done(e);
                }
            });
            exchange.publish('test-epp2', {
                "testResponse": "successful"
            });
        });
    });
    describe('RPC test', function() {

        it('should create a "promised-base" rpc server and bounce a few requests off it and back to client', function(done) {
            this.timeout(4000);
            var counter = 0;
            var corrIds = [uuid.v4(), uuid.v4(), uuid.v4()];
            var domains = ["test-me.com", "test-me-2.com", "test-me-3.com"];

            amqpConnection.serve('eppTest', 'serverQueue.testreg', function(msg, headers, deliveryInfo) {
                var deferred = Q.defer();
                expect(msg).to.have.deep.property('data.name');
                deferred.resolve({"response": "successful", "data": msg});
                return deferred.promise;
            });

            var handleResponse = function(response) {
                if (counter == 2) {
                    done();
                }
                counter = counter + 1;
            };
            // send several commands to server
            for (var i in domains) {
                var domain = domains[i];
                var corrId = corrIds[i];
                var msg = {
                    "command": "infoDomain",
                    "data": {
                        "name": domain
                    }
                };
                amqpConnection.rpc('eppTest', 'serverQueue.testreg', msg).then(handleResponse);
            }

        });
    });
});

