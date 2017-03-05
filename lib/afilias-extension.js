var commandMapping = [{
  "poll": "registryOperatorPollExtension"
}];
function AfiliasExtension() {
}

// <extension>
//     <roPoll:req xmlns:roPoll="urn:afilias:params:xml:ns:roPoll-1.0"/>
// </extension>
AfiliasExtension.prototype.registryOperatorPollExtension = function(data) {
  var config = this.config;
  var namespace = config.namespaces["ro-poll"].xmlns;
  return {
    "roPoll:req": {
      "_attr": {
        "xmlns:roPoll": namespace
      }
    }
  };
};

AfiliasExtension.mixinMapper = function(destObj) {
  return commandMapping;
};

module.exports = AfiliasExtension;