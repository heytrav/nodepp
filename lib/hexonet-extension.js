function HexonetExtension() {
}

HexonetExtension.prototype.createDomainExtension = function(data) {
    var processedExtension = {};
    return processedExtension;
};

HexonetExtension.mixin = function(destObj) {
    ['createDomainExtension'].forEach(function(property){
        destObj.prototype[property] = HexonetExtension.prototype[property];
    });
};

module.exports = HexonetExtension;
