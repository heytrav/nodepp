
var EPP = require('../lib/epp.js');
var EPPExtension = require('../lib/epp-extension.js');
var SecDnsExtension = require('../lib/secdns-extension.js');
var HexonetExtension = require('../lib/hexonet-extension.js');

/*  Compose extension classes into the main EPP library as needed. As different
    registries have different extensions, and some, but not all may use DNSSEC,
    use the registry config to determine which ones need to go in.
*/
function EppFactory() { }

EppFactory.prototype.generate = function(registry, config) {
    config.extensionClasses.forEach(function(extension) {
        switch (extension) {
            case 'SecDnsExtension':
                SecDnsExtension.mixin(EPP);
                break;
            case 'HexonetExtension':
                HexonetExtension.mixin(EPP);
                break;
            default:
                
        }
    });

    var epp = new EPP(registry, config);
    return epp;
};
module.exports = EppFactory;
