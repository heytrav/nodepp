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
});

