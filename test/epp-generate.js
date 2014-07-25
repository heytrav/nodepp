var chai = require('chai');

var expect = chai.expect,
should = chai.should;

var EPP = require('../lib/epp.js');
var mainConfig = require('../lib/epp-config.json');

describe('EPP serialisation', function() {
    var epp;
    describe('general commands', function() {
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
            var xml = epp.checkDomain({
                "domain": "test-domain.com"
            },
            'test-12345');
            expect(xml).to.match(/<check>(?:(?!<domain:name>).)*<domain:name>test-domain.com/);
        });

        it('should generate a createContact command', function() {
            var contactData = {

                "id": "auto",
                "voice": "+1.9405551234",
                "fax": "+1.9405551233",
                "email": "john.doe@null.com",
                "authInfo": {
                    "pw": "xyz123"
                },
                "disclose": {
                    "flag": 0,
                    "disclosing": ["voice", "email"]
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
            var xml = epp.createContact(contactData, 'test-12345');
            console.log("Got xml: ", xml);
            expect(xml).to.match(/xmlns:contact=\"urn:ietf:params:xml:ns:contact-1.0\"/);
            expect(xml).to.match(/<contact:name>John Doe<\/contact:name>/);
            expect(xml).to.match(/<contact:addr>(?:(?!<contact:city>).)*<contact:city>Springfield/);
            expect(xml).to.match(/<contact:disclose(?:(?!<contact:email>).)*<contact:email\/>/);
        });

    });

});

