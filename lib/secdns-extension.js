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

SecDnsExtension.prototype.createDomainSecDnsExtension = function(data) {
    var config = this.config;
    var namespace = config.namespaces.DNSSEC.xmlns;
    var processedExtension = {};
    if (data.dsData) {
        var dsData = data.dsData;
        var processedDsData = SecDnsExtension.prototype.processDsData(dsData);
        processedExtension = {
            'secDNS:create': {
                "_attr": {
                    "xmlns": namespace
                },
                "secDNS:maxSigLife": data.maxSigLife,
                "secDNS:dsData": processedDsData
            }
        };
    }
    return processedExtension;
};

SecDnsExtension.mixin = function(destObj) { ['createDomainSecDnsExtension'].forEach(function(property) {
        destObj.prototype[property] = SecDnsExtension.prototype[property];
    });
};

module.exports = SecDnsExtension;

