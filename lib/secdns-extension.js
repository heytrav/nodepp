function SecDnsExtension() {}

SecDnsExtension.prototype.processKeyData = function(keyData) {
    var processedKeyData = {
        "secDNS:flags": keyData.flags,
        "secDNS:protocol": keyData.protocol,
        "secDNS:alg": keyData.alg,
        "secDNS:pubKey": keyData.pubKey
    };
    return processedKeyData;
};

SecDnsExtension.prototype.processDsData = function(dsData) {
    var processedDsData = {
        "secDNS:keyTag": dsData.keyTag,
        "secDNS:alg": dsData.alg,
        "secDNS:digestType": dsData.digestType,
        "secDNS:digest": dsData.digest
    };
    if (dsData.keyData) processedDsData['secDNS:keyData'] = this.processKeyData(dsData.keyData);
    return processedDsData;
};

/*
 * Process DNSSEC data for a createDomain command
 * */

SecDnsExtension.prototype.createDomainSecDnsExtension = function(data) {
    var config = this.config;
    var namespace = config.namespaces.DNSSEC.xmlns;
    var processedExtension = {};
    var secCreate = {
        "_attr": {
            "xmlns:secDNS": namespace
        }
    };
    if (data.dsData) {
        var dsData = data.dsData;
        if (data.maxSigLife) secCreate["secDNS:maxSigLife"] = data.maxSigLife;
        var processedDsData = SecDnsExtension.prototype.processDsData(dsData);
        secCreate["secDNS:dsData"] = processedDsData;
    } else if (data.keyData) {
        var keyData = data.keyData;
        var processedKeyData = SecDnsExtension.prototype.processKeyData(keyData);
        secCreate["secDNS:keyData"] = processedKeyData;
    } else {
        return;
    }
    processedExtension = {
        'secDNS:create': secCreate
    };

    return processedExtension;
};

/*
 * Map generic epp function to extension equivalent.
 * */

SecDnsExtension.mixinMapper = function(destObj) {
    var commandMapping = [{
        "createDomain": "createDomainSecDnsExtension"
    }];
    return commandMapping;
};

module.exports = SecDnsExtension;

