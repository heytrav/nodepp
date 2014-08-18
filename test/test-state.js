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
    var protocol, stateMachine, fos;
    beforeEach(function() {
        stateMachine = new ProtocolState('hexonet-test1', config);
        var connection = stateMachine.connection;

        // Use a file stream instead of trying to talk to the actual registry,
        // we're only testing the "state" control here.
        var filename = ["/tmp/test-epp-protocol", moment().unix(), "state.log"].join('-');
        fos = fs.createWriteStream(filename, {
            "flags": "w",
            mode: 0666
        });
        connection.setStream(fos);
    });
    it('should start out offline', function() {
        expect(stateMachine.state).to.equal('offline');
    });

    afterEach(function() {
        // Close the writable stream after each test
        fos.end();
    });

    describe('simulate login', function() {

        it('should go into idle state once logged in', function(done) {
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
        //it('should move into idle loop following successful login', function() {
        ////expect(stateMachine.connected).to.equal(true);
        //expect(stateMachine.state).to.equal('idle');
        //});
        //it('should throw an error if transactionId not present', function() {
        //var testCrash = function() {
        //stateMachine.command('logout', {},
        //function() {
        //return {
        //"status": "OK"
        //};
        //});
        //};
        //expect(testCrash).to.
        //throw ('No transactionId provided');
        //});
        //it('should throw an error if callback not provided', function() {
        //var testCrash = function () {
        //stateMachine.command('dosesntMatter', {}, 'test-happiness');
        //};
        //expect(testCrash).to.throw('Return callback must be a function.');
        //});
        //it('should be disconnected after logging out', function() {
        //stateMachine.command('logout', {},
        //'test-logout-1234',
        //function() {
        //return {
        //"status": "OK"
        //};
        //});
        //});
        //it('should execute a specific command and then return to an idle state', function() {
        //stateMachine.command('checkDomain', {
        //"domain": "test-domain.com"
        //},
        //'test-checkDomain-1234', function() {
        //return {
        //"status": "OK"
        //};
        //});
        //expect(stateMachine.state).to.equal('idle');
        //});
    });
});

