var chai = require('chai'),
    spies = require('chai-spies');

var protocol = require('../lib/protocol.js');

var up = require('../lib/server.js'),
    expect = require('chai').expect;

describe('my file', function() {
    it('should convert strings to upper case', function() {
        expect(up('hello')).to.equal('HELLO');
    });
});
