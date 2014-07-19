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
	});

	it('should move into idle loop following successful login', function() {

		stateMachine.login({
			"login": "test-user",
			"password": "123xyz"
		},
		function() {
			return {
				"status": "OK"
			};
		});
        expect(stateMachine.state).to.equal('connected');

	});
});

