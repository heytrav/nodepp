var Amqp = require('amqp-as-promised');
nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
});
var uuid = require('node-uuid');
var rabbitmqConfig = nconf.get('rabbitmq');
var chai = require('chai');
var expect = chai.expect,
should = chai.should;

describe('RabbitMQ operation', function() {
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
        var serverQueue, clientQueue;
        before(function(done) {
            amqpConnection.queue('serverQueue', {
                "durable": false
            }).then(function(queue) {
                serverQueue = queue;
                serverQueue.bind(exchange, 'serverQueue');
                done();
            });
        });
        before(function(done) {
            amqpConnection.queue('clientQueue', {
                "durable": false
            }).then(function(queue) {
                clientQueue = queue;
                clientQueue.bind(exchange, 'clientQueue');
                done();
            });
        });
        it('should create an rpc queue and bounce multiple message back from server', function(done) {
            var counter = 0;
            var corrIds = [uuid.v4(), uuid.v4(), uuid.v4()];
            var domains = ["test-me.com", "test-me-2.com", "test-me-3.com"];

            serverQueue.subscribe({
                "ack": true
            },
            function(msg, headers, deliveryInfo, msgObject) {
                try {
                    expect(msg).to.have.deep.property('data.name', domains[counter]);
                    exchange.publish(deliveryInfo.replyTo, {
                        "response": "successful"
                    },
                    {
                        "correlationId": deliveryInfo.correlationId
                    });
                    msgObject.acknowledge(false);
                } catch(e) {
                    console.error(e);
                }
            });
            clientQueue.subscribe(function(msg, headers, deliveryInfo, msgObject) {
                try {
                    if (deliveryInfo.correlationId && deliveryInfo.correlationId == corrIds[counter]) {
                        expect(msg).to.have.deep.property('response', 'successful');
                        if (counter == 2) {
                            done();
                        }
                        counter = counter + 1;
                    }
                } catch(e) {
                    done(e);
                }
            });

            // send several commands to server
            for (var i in domains) {
                var domain = domains[i];
                var corrId = corrIds[i];
                exchange.publish('serverQueue', {
                    "command": "infoDomain",
                    "data": {
                        "name": domain
                    }
                },
                {
                    "replyTo": "clientQueue",
                    "correlationId": corrId
                });
            }

        });
    });
});

