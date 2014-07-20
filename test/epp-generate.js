var chai = require('chai');

var expect = chai.expect,
    should = chai.should;

var EPP = require('../lib/epp.js');

describe('EPP serialisation', function () {
    var epp;
    it('should be an epp object', function() {
        epp = new EPP();
        expect(epp).to.be.an.instanceof(Object);

        
    });
});
