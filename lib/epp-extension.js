function EPPExtension(registry, config) {
  this.registry = registry;
  this.config = config;
  this.extensionSet = [];
}

EPPExtension.prototype.createDomainExtension = function(data) {
  var processedExtension = {};
  return processedExtension;
};


module.exports = EPPExtension;
