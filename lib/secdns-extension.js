function SecDnsExtension() {
}

SecDnsExtension.prototype.createDomainSecDnsExtension = function(data) {
    var processedExtension = {};
    return processedExtension;
};

SecDnsExtension.mixin = function(destObj) {
    ['createDomainSecDnsExtension'].forEach(function(property){
        destObj.prototype[property] = SecDnsExtension.prototype[property];
    });
};

module.exports = SecDnsExtension;
