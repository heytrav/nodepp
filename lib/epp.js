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
        "processAuthInfo": function(data, namespace) {
            var authType = typeof(data);
            var authInfo, roid;
            var authInfoData = {};
            var pwKey = [namespace, 'pw'].join(':');
            authInfoData[pwKey] = {};
            if (authType === "string" || authType === "number") {
                authInfo = data;
            } else if (authType === "object") {
                if (!data.pw) throw new Error('pw is required!');
                authInfo = data.pw;
                if (data.roid) authInfoData[pwKey]._attr = {
                    "roid": data.roid
                };
            }
            authInfoData[pwKey]._value = authInfo;
            return authInfoData;
        },
        "processDomainContacts": function(data) {
            var contactData = [];
            for (var contactInfo in data) {
                var contact = data[contactInfo];
                for (var contactType in contact) {
                    var value = contact[contactType];
                    contactData.push({
                        "_attr": {
                            "type": contactType
                        },
                        "_value": value
                    });
                }
            }
            return contactData;
        },
        "processNSAttrIp": function(ipAddrObj) {
            var type = "v4";
            if (typeof(ipAddrObj) === 'string') {
                ip = ipAddrObj;
            } else if (typeof(ipAddrObj) === 'object') {
                ip = ipAddrObj.ip;
                if (!ip) throw new Error("Nameserver object missing IP");
                if (ipAddrObj.type) type = ipAddrObj.type;
            }
            var hostAddrObj = {
                "_attr": {
                    "ip": type
                },
                "_value": ip
            };
            return hostAddrObj;
        },
        "processIPAddrObjects": function (addr) {
            var addressObjects = [];
            if (typeof(addr) === 'string') {
                addressObjects.push(this.processNSAttrIp(addr));
            } else if (typeof(addr) === 'object') {
                if (addr.ip) addressObjects.push(this.processNSAttrIp(addr));
                else {
                    for (var i in addr) {
                        var ipAddrObj = addr[i];
                        addressObjects.push(this.processNSAttrIp(ipAddrObj));
                    }
                }
            }
            return addressObjects;
        },
        "processDomainNS": function(data) {
            var nsDataHostObjects = [];
            var nsDataHostAttrs = [];
            for (var host in data) {
                var ns = data[host];
                if (typeof(ns) === 'string') {
                    nsDataHostObjects.push(ns);
                } else if (typeof(ns) === "object") {
                    var nsHost = ns.host;
                    if (!nsHost) throw new Error("Host required in nameserver object!");
                    var hostAttrObj = {
                        "domain:hostName": nsHost
                    };
                    var addr = ns.addr;
                    if (addr) {
                        hostAttrObj["domain:hostAddr"] = this.processIPAddrObjects(addr);
                    }
                    nsDataHostAttrs.push(hostAttrObj);
                }
            }
            if (nsDataHostObjects.length) return {
                "domain:hostObj": nsDataHostObjects
            };
            if (nsDataHostAttrs.length) return {
                "domain:hostAttr": nsDataHostAttrs
            };
        },
        "processDomainPeriod": function(period) {
            var unit = "y",
            periodValue = 1;
            var periodType = typeof(period);
            if (periodType === "number" || periodType === "string") {
                periodValue = period;
            } else if (typeof(period) === 'object') {
                if (period.unit) unit = period.unit;
                if (period.value) periodValue = period.value;
            }
            return {
                "_attr": {
                    "unit": unit
                },
                "_value": periodValue
            };
        },
        "processDomainStatus": function(objStatus) {
            if (typeof(objStatus) === 'string') {
                return {
                    "_attr": {
                        "s": objStatus
                    },
                    "_value": null
                };

            } else if (typeof(objStatus) === 'object') {
                var statusData = {
                    "_attr": {}
                };
                for (var key in objStatus) {
                    var item = objStatus[key];
                    if (key === "value") {
                        statusData._value = item;
                    } else {
                        statusData._attr[key] = item;
                    }
                }
                return statusData;
            }
        },
        "createDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var contacts = this.processDomainContacts(data.contact);
            var nsHostObjects = this.processDomainNS(data.ns);
            var createData = {
                "_attr":{"xmlns:domain": domainNamespace.xmlns},
                "domain:name": data.name,
                "domain:period": this.processDomainPeriod(data.period),
                "domain:ns": nsHostObjects,
                "domain:registrant": data.registrant,
                "domain:contact": contacts,
            };
            if (data.authInfo) {
                createData["domain:authInfo"] = {
                    "domain:pw": data.authInfo.pw
                };
            }
            var xml = this.eppCommand({
                "create": {"domain:create": createData}
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
        "deleteDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var deleteData = {
                "domain:delete": {
                    "_attr": {
                        "xmlns:domain": domainNamespace.xmlns
                    },
                    "domain:name": data.domain
                }
            };
            var xml = this.eppCommand({
                "delete": deleteData
            },
            transactionId);
            return xml;
        },
        "renewDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var domainRenewData = {
                "_attr": {
                    "xmlns:domain": domainNamespace.xmlns
                },
                "domain:name": data.domain,
                "domain:curExpDate": data.curExpDate
            };
            if (data.period) {
                var unit = "y";
                if (data.period.unit) {
                    unit = data.period.unit;
                }
            }
            var renewData = {
                "domain:renew": domainRenewData
            };
            var xml = this.eppCommand({
                "renew": renewData
            },
            transactionId);
            return xml;
        },
        "transferDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var op = 'request';
            var allowedTransferOps = ["approve", "cancel", "query", "reject", "request"];
            if (data.op) {
                if (allowedTransferOps.indexOf(data.op) < 0) throw new Error("Transfer domain op must be one of the following: [" + allowedTransferOps.join(', ') + "].");
                op = data.op;
            }

            var transferData = {
                "_attr": {
                    "xmlns:domain": domainNamespace.xmlns
                },
                "domain:name": data.name
            };
            if (data.period) transferData["domain:period"] = this.processDomainPeriod(data.period);
            if (data.authInfo) transferData["domain:authInfo"] = this.processAuthInfo(data.authInfo, 'domain');
            else throw new Error("An 'authInfo' is required!");
            var xml = this.eppCommand({
                "transfer": {
                    "_attr": {
                        "op": op
                    },
                    "domain:transfer": transferData
                }
            },
            transactionId);
            return xml;
        },
        "updateDomain": function(data, transactionId) {
            var domainNamespace = config.namespaces.domain;
            var updateDomainData = {
                "_attr": {
                    "xmlns": domainNamespace.xmlns
                }
            };
            var change = data.chg;
            if (change) {
                var changeData = {};
                if (change.registrant) changeData['domain:registrant'] = change.registrant;
                if (change.authInfo) changeData['domain:authInfo'] = this.processAuthInfo(change.authInfo);
                updateDomainData['domain:chg'] = changeData;
            }
            var actions = ["add", "rem"];
            for (var i in actions) {
                var action = actions[i];
                var actionSet = data[action];
                if (actionSet) {
                    var actionKey = ['domain', action].join(':');
                    var actionData = {};
                    if (actionSet.ns) actionData['domain:ns'] = this.processDomainNS(actionSet.ns);
                    if (actionSet.contact) actionData['domain:contact'] = this.processDomainContacts(actionSet.contact);
                    if (actionSet.status) {
                        var stati = [];
                        for (var statusItem in actionSet.status) {
                            stati.push(this.processDomainStatus(actionSet.status[statusItem]));
                        }
                        actionData['domain:status'] = stati;
                    }
                    updateDomainData[actionKey] = actionData;
                }
            }

            var updateData = {
                "domain:update": updateDomainData
            };
            var xml = this.eppCommand({
                "update": updateData
            },
            transactionId);
            return xml;
        },
        "createHost": function(data, transactionId) {
            var hostNamespace = config.namespaces.host;
            var createData = {
                "_attr":{"xmlns:host": hostNamespace.xmlns},
                "host:name": data.name,
            };
            if (data.addr) 
                createData['host:addr'] = self.processIPAddrObjects(data.addr);

            var xml = this.eppCommand({
                "create": {"host:create": createData}
            },
            transactionId);
            return xml;
        },
        "infoHost": function(data, transactionId) {
            var hostNamespace = config.namespaces.host;
            var infoData = {
                "host:info": {
                    "_attr": {
                        "xmlns:host": hostNamespace.xmlns
                    },
                    "host:name": data.host
                }
            };
            var xml = this.eppCommand({
                "info": infoData
            },
            transactionId);
            return xml;
        },
        "deleteHost": function(data, transactionId) {
            var hostNamespace = config.namespaces.host;
            var deleteData = {
                "host:delete": {
                    "_attr": {
                        "xmlns:host": hostNamespace.xmlns
                    },
                    "host:name": data.host
                }
            };
            var xml = this.eppCommand({
                "delete": deleteData
            },
            transactionId);
            return xml;
        },
        "renewHost": function(data, transactionId) {
            var hostNamespace = config.namespaces.host;
            var hostRenewData = {
                "_attr": {
                    "xmlns:host": hostNamespace.xmlns
                },
                "host:name": data.host,
                "host:curExpDate": data.curExpDate
            };
            if (data.period) {
                var unit = "y";
                if (data.period.unit) {
                    unit = data.period.unit;
                }
            }
            var renewData = {
                "host:renew": hostRenewData
            };
            var xml = this.eppCommand({
                "renew": renewData
            },
            transactionId);
            return xml;
        },
        "updateHost": function(data, transactionId) {
            var hostNamespace = config.namespaces.host;
            var updateHostData = {
                "_attr": {
                    "xmlns": hostNamespace.xmlns
                }
            };
            var change = data.chg;
            if (change) {
                var changeData = {};
                if (change.registrant) changeData['host:registrant'] = change.registrant;
                if (change.authInfo) changeData['host:authInfo'] = this.processAuthInfo(change.authInfo);
                updateHostData['host:chg'] = changeData;
            }
            var actions = ["add", "rem"];
            for (var i in actions) {
                var action = actions[i];
                var actionSet = data[action];
                if (actionSet) {
                    var actionKey = ['host', action].join(':');
                    var actionData = {};
                    if (actionSet.ns) actionData['host:ns'] = this.processHostNS(actionSet.ns);
                    if (actionSet.contact) actionData['host:contact'] = this.processHostContacts(actionSet.contact);
                    if (actionSet.status) {
                        var stati = [];
                        for (var statusItem in actionSet.status) {
                            stati.push(this.processHostStatus(actionSet.status[statusItem]));
                        }
                        actionData['host:status'] = stati;
                    }
                    updateHostData[actionKey] = actionData;
                }
            }

            var updateData = {
                "host:update": updateHostData
            };
            var xml = this.eppCommand({
                "update": updateData
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
                            "s": addRemoveStatus,
                        },
                        "_value": null
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
        "callConvert": function(eppData, root) {
            var xml;
            try {
                xml = convert(root, eppData);

            } catch(e) {
                console.log("Caught an error while generating EPP");
            }
            return xml;
        },
        // wrap the entire EPP structure
        "eppWrapper": function(data) {
            var eppData = {
                "_attr": config.namespaces.epp
            };
            for (var key in data) {
                eppData[key] = data[key];
            }
            return this.callConvert(eppData, 'epp');
        }
    };
};

