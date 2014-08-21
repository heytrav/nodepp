nconf = require('nconf');
nconf.env().file({
    "file": "./config/epp-config.json"
});
var fs = require('fs');
var chai = require('chai');
var moment = require('moment');

var expect = chai.expect,
should = chai.should;

var ProtocolState = require('../lib/protocol-state.js');
var config = nconf.get('registries')['hexonet-test1'];

describe('Communication protocol state machine', function() {

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
            //console.info("Closing file handle");
            // Close the writable stream after each test
            fos.end();
        });
        before(function() {
            //console.log("initialising state machine");
            stateMachine = new ProtocolState('hexonet-test1', config);
            var connection = stateMachine.connection;

            // Use a file stream instead of trying to talk to the actual registry,
            // we're only testing the "state" control here.
            connection.setStream(fos);
        });

        it('should have loggedIn flag set to true once logged in', function(done) {
            stateMachine.login({
                "login": "test-user",
                "password": "1234xyz"
            },
            "test-login-1234").then(function(data) {
                //console.log("Got data in login test: ", data);
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
            stateMachine.logout('test-logout-1234').then(function(data) {
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

        after(function() {
            // Close the writable stream after each test
            fos.end();
        });
        before(function() {
            stateMachine = new ProtocolState('hexonet-test1', config);
            var connection = stateMachine.connection;

            // Use a file stream instead of trying to talk to the actual registry,
            // we're only testing the "state" control here.
            connection.setStream(fos);
        });
        it('should not have loggedIn true if log in failed', function(done) {
            stateMachine.login({
                "login": "test-user",
                "password": "abc123"
            },
            'test-fail-login').then(function(data) {
                done(new Error("Should not execute!"));
            },
            function(error) {
                expect(stateMachine.loggedIn).to.equal(false);
                done();
            });
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
                        console.log("Logged in: ", data);
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
                    //console.log("Got data back: ",data);
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
                //console.log("Created contact: ", data);
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
            var validationError = function () {
                stateMachine.command('createContact', contactData, transactionId).then(function(data) { });
            };
            expect(validationError).to.throw('postalInfo required in contact data');
        
        });

        after(function(done) {
            this.timeout(4000);
            stateMachine.logout('iwmn-logout').then(function() {
                done();
            });
        });

    });

});

