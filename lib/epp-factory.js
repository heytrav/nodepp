var winston = require('winston');
var EPP = require('../lib/epp');
var EPPExtension = require('../lib/epp-extension');
var SecDnsExtension = require('../lib/secdns-extension');
var HexonetExtension = require('../lib/hexonet-extension');
var AfiliasExtension = require('../lib/afilias-extension');

var nconf = require('./utilities/config').getConfig();
var logger = require('./utilities/logging').getLogger(nconf);
/*
 *  Compose extension classes into the main EPP library as needed. As
 *  different registries have different extensions, and some, but not all may
 *  use DNSSEC, use the registry config to determine which ones need to go in.
 **/

class EppFactory {
  constructor() {
  }

  static pushExtensionCommandMap(epp, command, extension, extensionFunction) {
    logger.debug("Adding " + command + ":" + extension + ":" + extensionFunction + " to epp object ");
    if (!epp.extensionCommandMap[command]) {
      epp.extensionCommandMap[command] = {};
    }
    epp.extensionCommandMap[command][extension] = extensionFunction;
  }

  static generate(registry, config) {
    var epp = new EPP(registry, config);
    config.extensionClasses && config.extensionClasses.forEach((extensionClass) => {
      var extension = extensionClass.extension;
      var className = extensionClass.className;
      var mixer,
        mapper;
      switch (className) {
        case 'SecDnsExtension':
          logger.debug("Applying secDNS mixin");
          mixer = SecDnsExtension;
          mapper = SecDnsExtension.mixinMapper();
          break;
        case 'HexonetExtension':
          mixer = HexonetExtension;
          logger.debug("Applying hexonet mixin");
          mapper = HexonetExtension.mixinMapper();
          break;
        case 'AfiliasExtension':
          mixer = AfiliasExtension;
          logger.debug("Applying afilias mixin");
          mapper = AfiliasExtension.mixinMapper();
          break;
        default:
      }
      // Complicated kludge to map the epp command to the extension command that
      // should be executed. See mapping in respective mixin class.
      mapper.forEach((mapping) => {
        for (var eppCommand in mapping) {
          var fn = mapping[eppCommand];
          epp[fn] = mixer.prototype[fn];
          EppFactory.pushExtensionCommandMap(epp, eppCommand, extension, fn);
        }
      });
    });

    return epp;
  }
  

}

module.exports = EppFactory;

