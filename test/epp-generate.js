var chai = require('chai');

var expect = chai.expect,
    should = chai.should;

var EPP = require('../lib/epp.js');

describe('EPP serialisation', function () {
    var epp;
    it('should be an epp object', function() {
        epp = new EPP('nzrs');
        expect(epp).to.be.an.instanceof(Object);
        var config = epp.config;
        expect(config.namespaces.epp.ns).to.be.equal('urn:ietf:params:xml:ns:epp-1.0');
        
    });
});
