var convert = require('data2xml')({'undefined': 'empty', 'null': 'closed'});
var fs, configurationfile;
configurationFile = './lib/epp-config.json';
fs = require('fs');
var configuration = JSON.parse(
fs.readFileSync(configurationFile));

module.exports = function(registry) {
	return {
		"config": configuration[registry],
        "hello": function() {
            return this.eppWrapper({"hello": null});
        },
		"login": function(data, transactionId) {
            var namespaces = this.config.namespaces;
            var namespaceServices = this.config.services;
            var extensionServices = this.config.extensions;
            var services = [];
            var extensions = [];
            for (var nsService in namespaceServices) {
                var service = namespaceServices[nsService];
                var namespace = namespaces[service].ns;
                services.push(namespace);
            }
            for (var extService in extensionServices) {
                var extension = extensionServices[extService];
                var extNamespace = namespaces[extension].ns;
                extensions.push(extNamespace);
            }
			var loginData = {
				"clID": data.login,
				"pw": data.password,
				"options": {
					"version": "1.0",
					"lang": "en"
				},
				"svcs": {
					"objURI": services,
                    "svcExtension": {"extURI": extensions}
				}
			};
            if (data.newPassword) {
                loginData.newPW = data.newPassword;
            }
			var xml = this.eppCommand({
				"login": loginData
			}, transactionId);
            return xml;
		},
        "logout" : function(transactionId) {
            return this.eppCommand({"logout": null}, transactionId);
        },
		"checkDomain": function(data) {

		},
		"checkContact": function(data) {
        },
        // wrap EPP commands
        "eppCommand": function(data, trId) {
            var commandData = data;
            commandData.clTRID = trId;
            var command = {"command": commandData};
            return this.eppWrapper(command);
        },
        // wrap the entire EPP structure
		"eppWrapper": function(data) {
			var xml;
            var eppData = { "_attr": { "xmlns": this.config.namespaces.epp.ns } };
            for (var key in data) {
                eppData[key] = data[key];
            }
			try {
				xml = convert("epp", eppData);

			} catch(e) {
				console.log("Caught an error while generating EPP");
			}
			return xml;

		}
	};
};

