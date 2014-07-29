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
        it('should render an "authInfo" section', function() {
            var authData = {
                pw: 'teStPass',
                roid: 'P-12345'
            };
            var processedData = epp.processAuthCode(authData, 'domain');
            var xml = epp.callConvert(processedData, 'test');
            //console.log(xml);
            expect(xml).to.match(/<domain:pw roid="P-12345">teStPass<\/domain:pw>/);
            var authNoRoidData = {
                pw: 'teStPass'
            };
            var processedNoRoid = epp.processAuthCode(authNoRoidData, 'contact');
            xml = epp.callConvert(processedNoRoid, 'test');
            expect(xml).to.match(/<contact:pw>teStPass<\/contact:pw>/);
        });
        it('should process different types of period data', function() {
            var periodData = 3;
            var processedData = epp.processDomainPeriod(periodData);
            expect(processedData._attr.unit).to.equal("y");
            expect(processedData._value).to.equal(periodData);

            var twelveMonthPeriod = {
                "unit": "m",
                "value": 12
            };
            var processedTwelveMonth = epp.processDomainPeriod(twelveMonthPeriod);
            expect(processedTwelveMonth._attr.unit).to.equal("m");
            expect(processedTwelveMonth._value).to.equal(twelveMonthPeriod.value);

            var unspecifiedUnit = {
                "value": 2
            };
            var processUnspecUnit = epp.processDomainPeriod(unspecifiedUnit);
            expect(processUnspecUnit._attr.unit).to.equal('y');

        });
        it('should generate an xml body', function() {
            var xml = epp.login({
                "login": "user1",
                "password": "abc123"
            },
            'test-1234');
            //console.log("Got xml: ", xml);
            expect(xml).to.match(/<login>/);
        });

        it('should generate a hello command', function() {
            var xml = epp.hello();
            //console.log("Got hello: ", xml);
            expect(xml).to.match(/<hello\/>/);
        });

        it('should generate a logout command', function() {
            var xml = epp.logout('test-1235');
            //console.log("Got logout: ", xml);
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
            //console.log("Got xml: ", xml);
            expect(xml).to.match(/xmlns:contact=\"urn:ietf:params:xml:ns:contact-1.0\"/);
            expect(xml).to.match(/<contact:name>John Doe<\/contact:name>/);
            expect(xml).to.match(/<contact:addr>(?:(?!<contact:city>).)*<contact:city>Springfield/);
            expect(xml).to.match(/<contact:disclose(?:(?!<contact:email>).)*<contact:email\/>/);
        });

        it('should generate an "update contact" command', function() {
            var updateData = {
                id: "p-12345",
                add: ['clientDeleteProhibited'],
                rem: ['clientTransferProhibited'],
                chg: {
                    "postalInfo": [{
                        "name": "John Doe",
                        "org": "Example Ltd",
                        "type": "loc",
                        "addr": [{
                            "street": ["742 Evergreen Terrace", "Apt b"],
                            "city": "Eugene",
                            "sp": "OR",
                            "pc": "97801",
                            "cc": "US"
                        }]
                    }],
                    "voice": "+1.9405551234",
                    "fax": "+1.9405551233",
                    "email": "john.doe@null.com",
                    "authInfo": {
                        "pw": "xyz123"
                    },
                    "disclose": {
                        "flag": 0,
                        "disclosing": ["voice", "email"]
                    }
                }
            };
            var xml = epp.updateContact(updateData, 'test-1234');
            //console.log("Got xml: ", xml);
            expect(xml).to.match(/<contact:status\ss=\"clientDeleteProhibited\"/);
            expect(xml).to.match(/<contact:status\ss=\"clientTransferProhibited\"/);
            expect(xml).to.match(/<contact:chg>(?:(?!<\/contact:chg>).)*<\/contact:chg>/);
        });

        it('should generate a create domain command', function() {
            var createDomain = {
                "name": "test-domain.com",
                "period": {
                    "unit": "y",
                    "value": 2
                },
                "ns": [{
                    "hostObj": "ns1.example.net"
                },
                {
                    "hostObj": "ns2.example.net"
                }],
                "registrant": "P-12345",
                "contact": [{
                    "admin": "P-12345"
                },
                {
                    "tech": "P-12346"
                },
                ],
                "authInfo": {
                    "pw": "Axri3kjp"
                }
            };
            var xml = epp.createDomain(createDomain, 'test-14989');
            //console.log(xml);
            expect(xml).to.match(/<domain:name>test-domain\.com<\/domain:name>/);
            expect(xml).to.match(/<domain:registrant>P-12345<\/domain:registrant/);
        });

    });

});

