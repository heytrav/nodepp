var convert = require('data2xml')({
    'undefined': 'empty',
    'null': 'closed'
});

module.exports = function(registry, config) {
    return {
        "hello": function() {
            return this.eppWrapper({
                "hello": null
            });
        },
        "login": function(data, transactionId) {
            var namespaces = config.namespaces;
            var namespaceServices = config.services;
            var extensionServices = config.extensions;
            var services = [];
            var extensions = [];
            for (var nsService in namespaceServices) {
                var service = namespaceServices[nsService];
                var namespace = namespaces[service].xmlns;
                services.push(namespace);
            }
            for (var extService in extensionServices) {
                var extension = extensionServices[extService];
                var extNamespace = namespaces[extension].xmlns;
                extensions.push(extNamespace);
            }
            var loginData = {
                "clID": data.login,
                "pw": data.password,
                "options": {
                    "version": "1.0",
                    "lang": "en"
                },
                "svcs": {
                    "objURI": services,
                    "svcExtension": {
                        "extURI": extensions
                    }
                }
            };
            if (data.newPassword) {
                loginData.newPW = data.newPassword;
            }
            var xml = this.eppCommand({
                "login": loginData
            },
            transactionId);
            return xml;
        },
        "logout": function(transactionId) {
            return this.eppCommand({
                "logout": null
            },
            transactionId);
        },
        "checkDomain": function(data, transactionId) {

            var domainNamespace = config.namespaces.domain;
            var checkData = {
                "domain:check": {
                    "_attr": {
                        "xmlns:domain": domainNamespace.xmlns
                    },
                    "domain:name": data.domain
                }
            };

            var xml = this.eppCommand({
                "check": checkData
            },
            transactionId);
            return xml;

        },
        "checkContact": function(data) {},
        "processPostalInfo": function(postalInfoSet) {

            var processedPostalInfo = [];
            for (var pI in postalInfoSet) {
                var postalInfo = postalInfoSet[pI];
                var addresses = postalInfo.addr;
                var preppedAddresses = [];
                for (var address in addresses) {
                    var curAddr = addresses[address];
                    var preppedCurAddr = {
                        "contact:street": curAddr.street,
                        "contact:city": curAddr.city,
                        "contact:sp": curAddr.sp,
                        "contact:pc": curAddr.pc,
                        "contact:cc": curAddr.cc
                    };
                    preppedAddresses.push(preppedCurAddr);
                }
                var processedPostal = {
                    "_attr": {
                        "type": postalInfo.type
                    },
                    "contact:name": postalInfo.name,
                    "contact:org": postalInfo.org,
                    "contact:addr": preppedAddresses,

                };
                processedPostalInfo.push(processedPostal);
            }
            return processedPostalInfo;
        },
        "createContact": function(data, transactionId) {
            var contactNamespace = config.namespaces.contact;
            var postalInfo = this.processPostalInfo(data.postalInfo);
            var createContact = {
                "_attr": {
                    "xmlns:contact": contactNamespace.xmlns
                },
                "contact:id": data.id,
                "contact:postalInfo": postalInfo,
                "contact:voice": data.voice,
                "contact:fax": data.fax,
                "contact:email": data.email,
                "contact:authInfo": {
                    "contact:pw": data.authInfo.pw
                },
            };
            if (data.disclose) {
                var disclose = data.disclose;
                var discloseFlag = 0;
                if ("flag" in disclose && disclose.flag) {
                    discloseFlag = 1;
                }
                var disclosing = {
                    "_attr": {
                        "flag": discloseFlag
                    }
                };
                if (disclose.disclosing) {
                    for (var toDisclose in disclose.disclosing) {
                        var disclElement = {};
                        var discl = disclose.disclosing[toDisclose];
                        var keyArray = ['contact', discl];
                        var key = keyArray.join(':');
                        disclosing[key] = null;
                    }
                }
                createContact['contact:disclose'] = disclosing;
            }
            var xml = this.eppCommand({
                "create": {
                    "contact:create": createContact
                }
            },
            transactionId);
            return xml;
        },
        // wrap EPP commands
        "eppCommand": function(data, trId) {
            var commandData = data;
            commandData.clTRID = trId;
            var command = {
                "command": commandData
            };
            return this.eppWrapper(command);
        },
        // wrap the entire EPP structure
        "eppWrapper": function(data) {
            var xml;
            var eppData = {
                "_attr": config.namespaces.epp
            };
            for (var key in data) {
                eppData[key] = data[key];
            }
            try {
                xml = convert("epp", eppData);

            } catch(e) {
                console.log("Caught an error while generating EPP");
            }
            return xml;

        }
    };
};

