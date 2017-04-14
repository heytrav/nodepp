var commandMapping = [{
  "poll": "registryOperatorPollExtension"
}];

class AfiliasExtension {
  constructor() {
  }

  /**
   * <extension>                                                           
   *     <roPoll:req xmlns:roPoll="urn:afilias:params:xml:ns:roPoll-1.0"/> 
   * </extension>                                                          
   */
  registryOperatorPollExtension(data) {
    var config = this.config;
    var namespace = config.namespaces["ro-poll"].xmlns;
    return {
      "roPoll:req": {
        "_attr": {
          "xmlns:roPoll": namespace
        }
      }
    };
  }

  static mixinMapper(destObj) {
    return commandMapping;
  }
}
module.exports = AfiliasExtension;
