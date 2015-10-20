nconf = require('nconf');
var path = require('path');
nconf.env().file({
    "file": path.resolve(__dirname, '..', 'config/epp-config-example.json')
});
var fs = require('fs');
var chai = require('chai');
var moment = require('moment');

var expect = chai.expect,
should = chai.should;

var ProtocolState = require('../lib/protocol-state.js');
var ProtocolConnection = require('../lib/connection.js');


describe.skip('Communication protocol state machine', function() {
    var config;
    if (nconf !== undefined) {
        var registries = nconf.get('registries');
        if (registries) {
            config = registries['registry-test3'];
        }
    }

    describe('simulate login/logout', function() {
        var stateMachine, fos;
        before(function() {
            var filename = ["/tmp/test-epp-protocol", moment().unix(), "state.log"].join('-');
            fos = fs.createWriteStream(filename, {
                "flags": "w",
                mode: 0666
            });
        });

        after(function() {
            // Close the writable stream after each test
            fos.end();
        });
        before(function() {
            try {

                stateMachine = new ProtocolState('hexonet-test1', config);
                var connection = stateMachine.connection;
                /* Use a file stream instead of trying to talk 
                 * to the actual registry, we're only testing the 
                 * "state" control here.
                 */
                connection.setStream(fos);
            } catch(e) {
                console.error(e);
                /* handle error */
            }
        });

        it('should have loggedIn flag set to true once logged in', function(done) {
            stateMachine.login({
                "login": "test-user",
                "password": "1234xyz"
            },
            "test-login-1234").then(function(data) {
                try {
                    expect(data).to.have.deep.property('result.code', 1000);
                    expect(stateMachine.loggedIn).to.equal(true);
                    done();

                } catch(e) {
                    done(e);
                }
            });
            var xmlSuccess = fs.readFileSync('./test/epp-success.xml');
            stateMachine.connection.clientResponse(xmlSuccess);
        });
        it('should have loggedIn flag set to false once logged out', function(done) {
            stateMachine.command('logout', {},
            'test-logout-1234').then(function(data) {
                try {
                    expect(stateMachine.loggedIn).to.equal(false);
                    done();
                } catch(e) {
                    done(e);
                }
            });
            var xmlSuccess = fs.readFileSync('./test/epp-success.xml');
            stateMachine.connection.clientResponse(xmlSuccess);
        });
    });

    describe('login error state', function() {
        var stateMachine, fos;
        before(function() {
            var filename = ["/tmp/test-epp-protocol", moment().unix(), "fail-login-state.log"].join('-');
            fos = fs.createWriteStream(filename, {
                "flags": "w",
                mode: 0666
            });
        });
        before(function() {
            stateMachine = new ProtocolState('hexonet-test1', config);
            var connection = stateMachine.connection;

            /* 
             * Use a file stream instead of trying to talk to 
             * the actual registry, we're only testing the 
             * "state" control here.
             */
            connection.setStream(fos);
        });

        after(function() {
            // Close the writable stream after each test
            fos.end();
        });
        it('should not have loggedIn true if log in failed', function(done) {
            stateMachine.login({
                "login": "test-user",
                "password": "abc123"
            },
            'test-fail-login').then(function(data) {
                expect(stateMachine.loggedIn).to.equal(false);
                done();
            },
            function(error) {
                done(new Error("should not execute"));
            }
            );
            var xmlSuccess = fs.readFileSync('./test/epp-fail.xml');
            stateMachine.connection.clientResponse(xmlSuccess);
        });
    });

    describe('command execution', function() {
        var stateMachine, fos, domain, transactionId;
        before(function(done) {
            this.timeout(10000);
            stateMachine = new ProtocolState('hexonet-test1', config);
            var connection = stateMachine.connection;
            connection.initStream().then(
            function(data) {
                setTimeout(
                function() {

                    stateMachine.login({
                        "login": config.login,
                        "password": config.password
                    },
                    'iwmn-test-1234').then(function(data) {
                        done();
                    },
                    function(error) {
                        done(error);
                        console.error("Unable to log in: ", error);
                    });
                },
                2000);
            });
        });
        before(function() {
            domain = ['iwmn', moment().unix(), 'test.com'].join('-');
        });
        beforeEach(function() {
            transactionId = ['iwmn', moment().unix()].join('-');
        });
        it('should execute a checkDomain for ' + domain, function(done) {
            this.timeout(4000);
            stateMachine.command('checkDomain', {
                "name": domain
            },
            transactionId).then(function(data) {
                try {
                    expect(data).to.have.deep.property('data.domain:chkData.domain:cd.domain:name.$t', domain);
                    done();
                } catch(e) {
                    done(e);
                }
            },
            function(error) {
                console.error("Unable to process response: ", error);
                done(error);
            });
        });
        it('should create a contact', function(done) {
            this.timeout(4000);
            var contactId = ['iwmn', moment().unix()].join('-');

            var contactData = {

                "id": contactId,
                "voice": "+1.9405551234",
                "fax": "+1.9405551233",
                "email": "john.doe@null.com",
                "authInfo": {
                    "pw": "xyz123"
                },
                "postalInfo": [{
                    "name": "John Doe",
                    "org": "Example Ltd",
                    "type": "int",
                    "addr": [{
                        "street": ["742 Evergreen Terrace", "Apt b"],
                        "city": "Springfield",
                        "sp": "OR",
                        "pc": "97801",
                        "cc": "US"
                    }]
                }]
            };
            stateMachine.command('createContact', contactData, transactionId).then(function(data) {
                expect(data).to.have.deep.property('result.code', 1000);
                done();
            },
            function(error) {
                console.log("Got error: ", error);
                done(error);
            });
        });

        it('should fail due to local validation', function() {
            this.timeout(4000);
            var contactId = ['iwmn', moment().unix()].join('-');

            var contactData = {

                "id": contactId,
                "voice": "+1.9405551234",
                "fax": "+1.9405551233",
                "email": "john.doe@null.com",
                "authInfo": {
                    "pw": "xyz123"
                },
                // omit postal info data
            };
            var validationError = function() {
                stateMachine.command('createContact', contactData, transactionId).then(function(data) {});
            };
            expect(validationError).to.
            throw ('postalInfo required in contact data');

        });

        after(function(done) {
            this.timeout(4000);
            stateMachine.command('logout', {},
            'iwmn-logout').then(function() {
                done();
            });
        });

    });
});

describe('Buffer preparation', function() {
    it('should get correct byte count for EPP with higher order byte characters', function() {

        var createContactXml = fs.readFileSync('./test/createContactUnicode.xml');
        var connection = new ProtocolConnection({});
        var prepped = connection.processBigEndian(createContactXml);
        var bufferedMessage = new Buffer(prepped);
        var bigEndianPrefix = bufferedMessage.slice(0,4);
        var actualLength = bigEndianPrefix.readUInt32BE(0);
        expect(actualLength).to.equal(1424 + 4);
    });

});
