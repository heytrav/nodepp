var commandMapping = [{
    "createDomain": "createDomainExtension"
}];
function HexonetExtension() {}

HexonetExtension.prototype.createDomainExtension = function(data) {
    var processedExtension = {};
    return processedExtension;
};

HexonetExtension.mixinMapper = function(destObj) {
    return commandMapping;
};

module.exports = HexonetExtension;

