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
        "processDomainContacts": function(data) {
            var contactData = [];
            for (var contactInfo in data) {
                var contact = data[contactInfo];
                for (var contactType in contact) {
                    var value = contact[contactType];
                    contactData.push( {
                                "_attr": {"type": contactType},
                                "_value": value
                            });
                }

            }
            return contactData;
        },
        "processDomainNS": function(data) {
            var nsData = [];
            for (var hostObj in data) {
                var ns = data[hostObj];
                nsData.push( ns.hostObj);
            }
            return {
                "domain:hostObj": nsData
            };
        },
        "createDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var contacts = this.processDomainContacts(data.contact);
            var nsHostObjects = this.processDomainNS(data.ns);
            var createData = {
                "domain:name": data.name,
                "domain:contact": contacts,
                "domain:ns": nsHostObjects
            };
            if (data.period) {
                var unit = "y";
                if (data.period.unit) {
                    unit = data.period.unit;
                }
               createData["domain:period"] = {
                   "_attr": {"unit": unit},
                   "_value": data.period.value
               } ;
            }
            if (data.authInfo) {
                createData["domain:authInfo"] = {"domain:pw": data.authInfo.pw};
            }
            if (data.registrant) {
                createData["domain:registrant"] = data.registrant;
            }
            var xml = this.eppCommand({
                "create": createData
            },
            transactionId);
            return xml;
        },
        "infoDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var infoData = {
                "domain:info": {
                    "_attr": {
                        "xmlns:domain": domainNamespace.xmlns
                    },
                    "domain:name": data.domain
                }
            };
            var xml = this.eppCommand({
                "info": infoData
            },
            transactionId);
            return xml;
        },
        "checkContact": function(data, transactionId) {
            var contactNamespace = config.namespace.contact;
            var checkData = {
                "contact:check": {
                    "_attr": {
                        "xmlns:contact": contactNamespace.xmlns
                    },
                    "contact:id": data.id
                }
            };
            var xml = this.eppCommand({
                "check": checkData
            },
            transactionId);
            return xml;
        },
        "infoContact": function(data, transactionId) {
            var contactNamespace = config.namespace.contact;
            var infoData = {
                "contact:info": {
                    "_attr": {
                        "xmlns:contact": contactNamespace.xmlns
                    },
                    "contact:id": data.id
                }
            };
            var xml = this.eppCommand({
                "info": infoData
            },
            transactionId);
            return xml;
        },
        "processContactAddRemove": function(array) {
            var processedAddRemove = [];
            for (var element in array) {
                var addRemoveStatus = array[element];
                processedAddRemove.push({
                    "contact:status": {
                        "_attr": {
                            "s": addRemoveStatus
                        }
                    }
                });
            }
            return processedAddRemove;
        },
        "updateContact": function(data, transactionId) {
            var contactNamespace = config.namespaces.contact;
            var change = data.chg;

            var updateContactData = {
                "_attr": {
                    "xmlns": contactNamespace.xmlns
                },
                "contact:id": data.id
            };
            if (data.add) {
                updateContactData["contact:add"] = this.processContactAddRemove(data.add);
            }
            if (data.rem) {
                updateContactData["contact:rem"] = this.processContactAddRemove(data.rem);
            }
            if (change) {
                updateContactData['contact:chg'] = this.processContactData(change);
            }
            var xml = this.eppCommand({
                "update": {
                    "contact:update": updateContactData
                }
            },
            transactionId);
            return xml;
        },
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
        "processContactData": function(data) {
            var keys = ["voice", "fax", "email"];
            var processedContactData = {};
            var postalInfo = this.processPostalInfo(data.postalInfo);
            if (postalInfo) {
                processedContactData['contact:postalInfo'] = postalInfo;
            }
            for (var key in keys) {
                var contactKey = keys[key];
                if (contactKey in data) {
                    var value = data[contactKey];
                    var dataKey = ["contact", contactKey].join(':');
                    processedContactData[dataKey] = value;
                }
            }
            if (data.authInfo) {
                processedContactData['contact:authInfo'] = {
                    "contact:pw": data.authInfo.pw
                };
            }
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
                        var eppKey = keyArray.join(':');
                        disclosing[eppKey] = null;
                    }
                }
                processedContactData['contact:disclose'] = disclosing;
            }
            return processedContactData;
        },
        "createContact": function(data, transactionId) {
            var contactNamespace = config.namespaces.contact;
            var processedContactData = this.processContactData(data);
            var createContact = {
                "_attr": {
                    "xmlns:contact": contactNamespace.xmlns
                },
                "contact:id": data.id,
            };
            for (var key in processedContactData) {
                createContact[key] = processedContactData[key];
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

