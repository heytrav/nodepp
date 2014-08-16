amqp = require('amqp');
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
        amqpConnection = amqp.createConnection(rabbitmqConfig.connection);
        amqpConnection.on('ready', function() {
            exchange = amqpConnection.exchange('eppTest');
            exchange.on('open', function() {
                done();
            });
        });
    });
    describe('test one-way queues',function() {
        var eppQueue, backendQueue;
        before(function(done) {
            eppQueue = amqpConnection.queue('eppQueue', function(queue) {
                eppQueue.bind(exchange, 'test-epp');
                done();
            });
        });
        before(function(done) {
            backendQueue = amqpConnection.queue('eppResponse', function(queue) {
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
    describe('RPC test', function () {
        var serverQueue, clientQueue;
        before(function(done) {
            serverQueue = amqpConnection.queue('serverQueue',  function (queue) {
                serverQueue.bind(exchange, 'serverQueue');
                done();
            } );
        });
        before(function(done) {
            clientQueue = amqpConnection.queue('clientQueue', {"exclusive": true}, function (queue) {
                clientQueue.bind(exchange, 'clientQueue');
                done();
            } );
        });
        it('should create an rpc queue', function(done) {
            serverQueue.subscribe( function(msg, headers, deliveryInfo, msgObject) {
                expect(msg).to.have.deep.property('data.name', 'test-me.com');
                exchange.publish(deliveryInfo.replyTo, {"response": "successful"}, {"correlationId": deliveryInfo.correlationId});
            });
            var corrId = uuid.v4();
            clientQueue.subscribe(function(msg, headers, deliveryInfo, msgObject) {
                try {
                    if (deliveryInfo.correlationId && deliveryInfo.correlationId == corrId) {
                        expect(msg).to.have.deep.property('response', 'successful');
                        done();
                    }
                } catch (e) {
                    /* handle error */
                    done(e);
                }
            });

            exchange.publish('serverQueue', {
                "command": "infoDomain", "data": {"name": "test-me.com"}
            }, {"replyTo": "clientQueue", "correlationId": corrId } );

        });
    });



    after(function() {
        amqpConnection.disconnect();

    });
});

