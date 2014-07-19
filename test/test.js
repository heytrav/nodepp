var chai = require('chai'),
spies = require('chai-spies');

chai.use(spies);

var expect = chai.expect,
should = chai.should;

var commandState = require('../lib/command-state.js');

describe('EPP state machine', function() {
	var protocol, stateMachine;
	beforeEach(function() {
		stateMachine = commandState();
	});
	it('should start out offline', function() {
		expect(stateMachine.state).to.equal('offline');
        expect(stateMachine.connected).to.equal(false);
	});

    describe('EPP Logged in', function() {
    
        beforeEach(function(){
            stateMachine.login({
                "login": "test-user",
                "password": "123xyz"
            },
            function() {
                return {
                    "status": "OK"
                };
            });
        });
        it('should move into idle loop following successful login', function() {
            expect(stateMachine.connected).to.equal(true);
            expect(stateMachine.state).to.equal('idle');

        });
        it('should be disconnected after logging out', function() {
            stateMachine.logout(function() {
                return {"status": "OK"};
            });
            expect(stateMachine.connected).to.equal(false);
        });
    });
});

