var chai = require('chai');

var expect = chai.expect,
should = chai.should;

var EPP = require('../lib/epp.js');
var mainConfig = require('../lib/epp-config.json');

describe('EPP serialisation', function() {
    var epp;
    describe('NZRS specific', function() {
        var config;
        beforeEach(function() {
            config = mainConfig.nzrs;
            epp = new EPP('nzrs', config);
        });

        it('should be an epp object with nzrs config', function() {
            expect(epp).to.be.an.instanceof(Object);
            expect(config.namespaces.epp.xmlns).to.be.equal('urn:ietf:params:xml:ns:epp-1.0');
        });

        it('should generate an xml body', function() {
            var xml = epp.login({
                "login": "user1",
                "password": "abc123"
            },
            'test-1234');
            console.log("Got xml: ", xml);
            expect(xml).to.match(/<login>/);
        });

        it('should generate a hello command', function() {
            var xml = epp.hello();
            console.log("Got hello: ", xml);
            expect(xml).to.match(/<hello\/>/);
        });

        it('should generate a logout command', function() {
            var xml = epp.logout('test-1235');
            console.log("Got logout: ", xml);
            expect(xml).to.match(/<logout\/>/);
        });

        it('should generate a checkDomain command', function() {
            var xml = epp.checkDomain( {"domain": "test-domain.com"}, 'test-12345');
            expect(xml).to.match(/<check>(?:(?!<\/check>).)*<\/check>/);
        });

    });

});

