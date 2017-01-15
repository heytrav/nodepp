var winston = require('winston');
var nconf = require('nconf');

nconf.env()
var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ 
          "level": log_level,
          "json": true

      })
    ]
});

var convert = require('data2xml')({
    'undefined': 'empty',
    'null': 'closed'
});

function EPP(registry, config) {
    this.registry = registry;
    this.config = config;
    this.extensionCommandMap = {};
}

EPP.prototype.hello = function() {
    return this.eppWrapper({
        "hello": null
    });
};

EPP.prototype.login = function(data, transactionId) {
    var config = this.config;
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
};

EPP.prototype.logout = function(data, transactionId) {
    return this.eppCommand({
        "logout": null
    },
    transactionId);
};

EPP.prototype.processAuthInfo = function(data, namespace) {
    var authType = typeof(data);
    var authInfo, roid;
    var authInfoData = {};
    var pwKey = [namespace, 'pw'].join(':');
    authInfoData[pwKey] = {};
    if (authType === "string" || authType === "number") {
        authInfo = data;
    } else if (authType === "object") {
        if (!data.hasOwnProperty('pw')) throw new Error('pw is required!');
        authInfo = data.pw;
        if (data.roid) authInfoData[pwKey]._attr = {
            "roid": data.roid
        };
    }
    authInfoData[pwKey]._value = authInfo;
    return authInfoData;
};

EPP.prototype.processDomainContacts = function(data) {
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
};

EPP.prototype.processNSAttrIp = function(ipAddrObj) {
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
};

EPP.prototype.processIPAddrObjects = function(addr) {
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
};
EPP.prototype.processDomainNS = function(data) {
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
};
EPP.prototype.processDomainPeriod = function(period) {
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
};
EPP.prototype.processStatus = function(objStatus) {
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
};
EPP.prototype.processStatusSet = function(statusSet) {
    var stati = [];
    for (var statusItem in statusSet) {
        stati.push(this.processStatus(statusSet[statusItem]));
    }
    return stati;
};
EPP.prototype.processContactAddRemove = function(array) {
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
};
EPP.prototype.processPostalAddressItem = function(curAddr) {
    this.normaliseVariants('cc', curAddr, ["country", "ccode"]);
    this.normaliseVariants('pc', curAddr, ["pcode", "postcode", "zip"]);
    this.normaliseVariants('sp', curAddr, ["state"]);
    var preppedCurAddr = {
        "contact:street": curAddr.street,
        "contact:city": curAddr.city,
        "contact:sp": curAddr.sp,
        "contact:pc": curAddr.pc,
        "contact:cc": curAddr.cc
    };
    return preppedCurAddr;
};
EPP.prototype.processPostalAddresses = function(addresses) {
    var preppedAddresses = [];
    if (addresses instanceof Array) {
        for (var i in addresses) {
            var addrItem = this.processPostalAddressItem(addresses[i]);
            preppedAddresses.push(addrItem);
        }
    } else {
        var addr = this.processPostalAddressItem(addresses);
        preppedAddresses.push(addr);
    }
    return preppedAddresses;
};
/* Try and convert a contact's name into something EPP recognises. EPP expects
 * a single "name" field with the contact's first and last name. Most
 * homegrown stuff stores it separately as "firstname" and "lastname".
 * */
EPP.prototype.processContactName = function(data) {
    if (!data.hasOwnProperty('name')) {
        // temporarily normalise the first and lastnames into something
        var firstname = '',
        surname = '';
        var firstNameAlternatives = ["firstname", "first_name"];
        var surnameAlternatives = ["lastname", "last_name", "surname"];
        for (var i in firstNameAlternatives) {
            var firstnameAlt = firstNameAlternatives[i];
            if (data.hasOwnProperty(firstnameAlt)) {
                firstname = data[firstnameAlt];
                break;
            }
        }
        for (var j in surnameAlternatives) {
            var surnameAlt = surnameAlternatives[j];
            if (data.hasOwnProperty(surnameAlt)) {
                surname = data[surnameAlt];
                break;
            }
        }
        if (firstname.length === 0 && surname.length === 0) {
            // hey we did our best
            return;
        }
        data.name = [firstname, surname].join(' ');
    }
};
EPP.prototype.processPostalInfoItem = function(postalInfo) {
    this.normaliseVariants('org', postalInfo, ["company", "organization", "organisation"]);

    this.processContactName(postalInfo);
    var addresses = postalInfo.addr;
    var processedPostal = {
        "_attr": {
            "type": postalInfo.type
        }
    };
    if (postalInfo.hasOwnProperty('name')) processedPostal["contact:name"] = postalInfo.name;
    if (postalInfo.hasOwnProperty('org')) processedPostal["contact:org"] = postalInfo.org;

    if (postalInfo.addr) processedPostal["contact:addr"] = this.processPostalAddresses(postalInfo.addr);

    return processedPostal;

};
EPP.prototype.processPostalInfo = function(postalInfoSet) {
    if (!postalInfoSet) {
        throw new Error("postalInfo required in contact data.");
    }
    var processedPostalInfo = [];
    if (postalInfoSet instanceof Array) {
        for (var pI in postalInfoSet) {
            var postalInfo = postalInfoSet[pI];
            var processedPostalItem = this.processPostalInfoItem(postalInfo);
            processedPostalInfo.push(processedPostalItem);
        }
    } else {
        var processedPostal = this.processPostalInfoItem(postalInfoSet);
        processedPostalInfo.push(processedPostal);
    }
    return processedPostalInfo;
};
/*
 * Convert various alternative attributes into what EPP wants. This
 * way we can still use more sensible and intuitive attributes in legacy code
 * and not need to completely rewrite everything.
 *
 * */
EPP.prototype.normaliseVariants = function(key, data, alternatives) {
    for (var i in alternatives) {
        var alt = alternatives[i];
        if (data.hasOwnProperty(alt) && ! data.hasOwnProperty(key)) {
            data[key] = data[alt];
        }
    }
};
EPP.prototype.processContactData = function(data) {
    this.normaliseVariants('voice', data, ["tel", "telephone", "phone"]);

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
    this.normaliseVariants('authInfo', data, ["authcode", "authCode", "auth_code", "password", "pw"]);
    data.authInfo = data.authInfo || '';
    processedContactData['contact:authInfo'] = this.processAuthInfo(data.authInfo, 'contact');
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
};
EPP.prototype.checkDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    var domain = data.domain;
    if (!domain) domain = data.name;
    var checkData = {
        "domain:check": {
            "_attr": {
                "xmlns:domain": domainNamespace.xmlns
            },
            "domain:name": domain
        }
    };

    var xml = this.eppCommand({
        "check": checkData
    },
    transactionId);
    return xml;
};
EPP.prototype.infoDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    var domain = data.domain;
    if (!domain) domain = data.name;
    var domainData = {
        "_attr": {
            "xmlns:domain": domainNamespace.xmlns
        },
        "domain:name": domain
    };
    this.normaliseVariants('authInfo', data, ["authcode", "authCode", "auth_code", "password", "pw"]);
    if (data.authInfo) domainData['domain:authInfo'] = this.processAuthInfo(data.authInfo, 'domain');
    var infoData = {
        "domain:info": domainData
    };
    var xml = this.eppCommand({
        "info": infoData
    },
    transactionId);
    return xml;
};
EPP.prototype.createDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    var contacts = this.processDomainContacts(data.contact);
    var nsHostObjects = this.processDomainNS(data.ns);
    this.normaliseVariants('period', data, ["interval"]);
    this.normaliseVariants('registrant', data, ["owner"]);
    var createData = {
        "_attr": {
            "xmlns:domain": domainNamespace.xmlns
        },
        "domain:name": data.name,
        "domain:period": this.processDomainPeriod(data.period),
        "domain:ns": nsHostObjects,
        "domain:registrant": data.registrant,
        "domain:contact": contacts,
    };
    this.normaliseVariants('authInfo', data, ["authcode", "authCode", "auth_code", "password", "pw"]);
    data.authInfo = data.authInfo || '';
    createData['domain:authInfo'] = this.processAuthInfo(data.authInfo, 'domain');
    var commandData = {
        "create": {
            "domain:create": createData
        }
    };
    var processedExtension = this.processExtensions(data, 'createDomain');

    if (processedExtension) commandData.extension = processedExtension;
    var xml = this.eppCommand(commandData, transactionId);
    return xml;
};
EPP.prototype.updateDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    this.normaliseVariants('name', data, ["domain"]);
    var updateDomainData = {
        "_attr": {
            "xmlns:domain": domainNamespace.xmlns
        },
        "domain:name": data.name
    };
    var actions = ["add", "rem"];
    for (var i in actions) {
        var action = actions[i];
        var actionSet = data[action];
        if (actionSet) {
            var actionKey = ['domain', action].join(':');
            var actionData = {};
            if (actionSet.ns) actionData['domain:ns'] = this.processDomainNS(actionSet.ns);
            if (actionSet.contact) actionData['domain:contact'] = this.processDomainContacts(actionSet.contact);
            if (actionSet.status) actionData['domain:status'] = this.processStatusSet(actionSet.status);
            updateDomainData[actionKey] = actionData;
        }
    }
    var change = data.chg;
    if (change) {
        var changeData = {};
        this.normaliseVariants('registrant', change, ["owner"]);
        if (change.registrant) changeData['domain:registrant'] = change.registrant;
        this.normaliseVariants('authInfo', change, ["authcode", "authCode", "auth_code", "password", "pw"]);
        if (change.hasOwnProperty('authInfo')) changeData['domain:authInfo'] = this.processAuthInfo(change.authInfo, 'domain');
        updateDomainData['domain:chg'] = changeData;
    }

    var updateData = {
        "domain:update": updateDomainData
    };
    var commandData = {
        "update": updateData
    };
    var processedExtension = this.processExtensions(data, 'updateDomain');
    if (processedExtension) commandData.extension = processedExtension;
    var xml = this.eppCommand(commandData, transactionId);
    return xml;
};
EPP.prototype.renewDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    this.normaliseVariants('name', data, ["domain"]);
    var domain = data.name;
    var domainRenewData = {
        "_attr": {
            "xmlns:domain": domainNamespace.xmlns
        },
        "domain:name": domain,
        "domain:curExpDate": data.curExpDate
    };
    this.normaliseVariants('period', data, ["interval"]);
    if (data.period) domainRenewData["domain:period"] = this.processDomainPeriod(data.period);
    var renewData = {
        "domain:renew": domainRenewData
    };
    var xml = this.eppCommand({
        "renew": renewData
    },
    transactionId);
    return xml;
};
EPP.prototype.transferDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    var op = 'request';
    this.normaliseVariants('name', data, ["domain"]);
    var allowedTransferOps = ["approve", "cancel", "query", "reject", "request"];
    if (data.op) {
        var joinedOps = allowedTransferOps.join(', ');
        var message = "Transfer domain op must be one of the following: [" + joinedOps + "].";
        if (allowedTransferOps.indexOf(data.op) < 0) throw new Error(message);
        op = data.op;
    }

    var transferData = {
        "_attr": {
            "xmlns:domain": domainNamespace.xmlns
        },
        "domain:name": data.name
    };
    this.normaliseVariants('period', data, ["interval"]);
    if (data.period) transferData["domain:period"] = this.processDomainPeriod(data.period);
    this.normaliseVariants('authInfo', data, ["authcode", "authCode", "auth_code", "password", "pw"]);
    data.authInfo = data.authInfo || '';
    transferData["domain:authInfo"] = this.processAuthInfo(data.authInfo, 'domain');
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
};
EPP.prototype.deleteDomain = function(data, transactionId) {
    var config = this.config;
    var domainNamespace = config.namespaces.domain;
    this.normaliseVariants('name', data, ["domain"]);
    var deleteData = {
        "domain:delete": {
            "_attr": {
                "xmlns:domain": domainNamespace.xmlns
            },
            "domain:name": data.name
        }
    };
    var xml = this.eppCommand({
        "delete": deleteData
    }, transactionId);
    return xml;
};
EPP.prototype.checkHost = function(data, transactionId) {
    var config = this.config;
    var hostNamespace = config.namespaces.host;
    var host = data.name;
    if (!host) {
        host = data.host;
    }
    var checkData = {
        "host:check": {
            "_attr": {
                "xmlns:host": hostNamespace.xmlns
            },
            "host:name": host
        }
    };
    var xml = this.eppCommand({
        "check": checkData
    },
    transactionId);
    return xml;
};
EPP.prototype.infoHost = function(data, transactionId) {
    var config = this.config;
    var hostNamespace = config.namespaces.host;
    var infoData = {
        "host:info": {
            "_attr": {
                "xmlns:host": hostNamespace.xmlns
            },
            "host:name": data.name
        }
    };
    var xml = this.eppCommand({
        "info": infoData
    },
    transactionId);
    return xml;
};
EPP.prototype.createHost = function(data, transactionId) {
    var config = this.config;
    var hostNamespace = config.namespaces.host;
    var createData = {
        "_attr": {
            "xmlns:host": hostNamespace.xmlns
        },
        "host:name": data.name,
    };
    if (data.addr) createData['host:addr'] = this.processIPAddrObjects(data.addr);

    var xml = this.eppCommand({
        "create": {
            "host:create": createData
        }
    },
    transactionId);
    return xml;
};
EPP.prototype.updateHost = function(data, transactionId) {
    var config = this.config;
    var hostNamespace = config.namespaces.host;
    var updateHostData = {
        "_attr": {
            "xmlns:host": hostNamespace.xmlns
        },
        'host:name': data.name
    };
    var actions = ["add", "rem"];
    for (var i in actions) {
        var action = actions[i];
        var actionSet = data[action];
        if (actionSet) {
            var actionKey = ['host', action].join(':');
            var actionData = {};
            if (actionSet.addr) actionData['host:addr'] = this.processIPAddrObjects(actionSet.addr);
            if (actionSet.status) actionData['host:status'] = this.processStatusSet(actionSet.status);
            updateHostData[actionKey] = actionData;
        }
    }

    var change = data.chg;
    if (change) {
        var changeData = {};
        if (!change.name) throw new Error("when changing the host object, a name is required");
        changeData['host:name'] = change.name;
        updateHostData['host:chg'] = changeData;
    }

    var updateData = {
        "host:update": updateHostData
    };
    var xml = this.eppCommand({
        "update": updateData
    },
    transactionId);
    return xml;
};
EPP.prototype.deleteHost = function(data, transactionId) {
    var config = this.config;
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
};
EPP.prototype.checkContact = function(data, transactionId) {
    var config = this.config;
    var contactNamespace = config.namespaces.contact;
    var contactId = data.id;
    if (!contactId) {
        contactId = data.contact;
    }
    var checkData = {
        "contact:check": {
            "_attr": {
                "xmlns:contact": contactNamespace.xmlns
            },
            "contact:id": contactId
        }
    };
    var xml = this.eppCommand({
        "check": checkData
    },
    transactionId);
    return xml;
};
EPP.prototype.infoContact = function(data, transactionId) {
    var config = this.config;
    var contactNamespace = config.namespaces.contact;
    var contactId = data.id;
    if (!contactId) {
        contactId = data.contact;
    }
    var infoData = {
        "contact:info": {
            "_attr": {
                "xmlns:contact": contactNamespace.xmlns
            },
            "contact:id": contactId
        }
    };
    var xml = this.eppCommand({
        "info": infoData
    },
    transactionId);
    return xml;
};
EPP.prototype.createContact = function(data, transactionId) {
    var config = this.config;
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
};
EPP.prototype.updateContact = function(data, transactionId) {
    var config = this.config;
    var contactNamespace = config.namespaces.contact;
    var change = data.chg;
    var contactId = data.id;
    if (!contactId) {
        contactId = data.contact;
    }

    var updateContactData = {
        "_attr": {
            "xmlns:contact": contactNamespace.xmlns
        },
        "contact:id": contactId
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
};
EPP.prototype.transferContact = function(data, transactionId) {
    var config = this.config;
    var contactNamespace = config.namespaces.contact;
    var contact = data.id;
    if (!contact) contact = data.contact;
    var op = 'request';
    var allowedTransferOps = ["approve", "cancel", "query", "reject", "request"];
    if (data.op) {
        var joinedOps = allowedTransferOps.join(', ');
        var message = "Transfer contact op must be one of the following: [" + joinedOps + "].";
        if (allowedTransferOps.indexOf(data.op) < 0) throw new Error(message);
        op = data.op;
    }

    var transferData = {
        "_attr": {
            "xmlns:contact": contactNamespace.xmlns
        },
        "contact:name": contact
    };
    this.normaliseVariants('authInfo', data, ["authcode", "authCode", "auth_code", "password", "pw"]);
    data.authInfo = data.authInfo || '';
    transferData["contact:authInfo"] = this.processAuthInfo(data.authInfo, 'contact');
    var xml = this.eppCommand({
        "transfer": {
            "_attr": {
                "op": op
            },
            "contact:transfer": transferData
        }
    },
    transactionId);
    return xml;
};
EPP.prototype.deleteContact = function(data, transactionId) {
    var config = this.config;
    var contactNamespace = config.namespaces.contact;
    this.normaliseVariants('id', data, ["contact"]);
    var contactId = data.id;
    var deleteData = {
        "contact:delete": {
            "_attr": {
                "xmlns:contact": contactNamespace.xmlns
            },
            "contact:id": contactId
        }
    };
    var xml = this.eppCommand({
        "delete": deleteData
    },
    transactionId);
    return xml;
};
EPP.prototype.poll = function(data, transactionId) {
    var op = "req";
    var processedPoll = {
        "_attr": {},
        "_value": null
    };
    if (data.msgID) {
        op = "ack";
    }
    if (!data.op) data.op = op;
    for (var key in data) {
        processedPoll._attr[key] = data[key];
    }

    var command = {
        "poll": processedPoll,
    };

    var processedExtension = this.processExtensions(data, 'poll');
    if (processedExtension) command.extension = processedExtension;

    var xml = this.eppCommand(command, transactionId);
    return xml;
};
EPP.prototype.eppCommand = function(data, trId) {
    var commandData = data;
    commandData.clTRID = trId;
    var command = {
        "command": commandData
    };
    return this.eppWrapper(command);
};
EPP.prototype.callConvert = function(eppData, root) {
    var xml;
    try {
        xml = convert(root, eppData);
    } catch(e) {
        logger.error("Caught an error while generating EPP: ", e);
    }
    return xml;
};
EPP.prototype.eppWrapper = function(data) {
    var config = this.config;
    var eppData = {
        "_attr": config.namespaces.epp
    };
    for (var key in data) {
        eppData[key] = data[key];
    }
    return this.callConvert(eppData, 'epp');
};

EPP.prototype.processExtensions = function(data, command) {
    var commandMap = this.extensionCommandMap[command];
    if (commandMap && data.extension) {
        var processedExtension = {};
        for (var extension in data.extension) {
            var extensionFunction = commandMap[extension];
            if (extensionFunction) {
                var extensionData = data.extension[extension];
                var result = this[extensionFunction](extensionData);
                for (var key in result) {
                    processedExtension[key] = result[key];
                }
            }
        }
        return processedExtension;
    }
    return undefined;
};

module.exports = EPP;

