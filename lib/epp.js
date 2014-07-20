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
		"login": function(data) {
            var namespaces = this.config.namespaces;
            var namespaceServices = ['contact', 'domain'];
            var services = [];
            for (var nsService in namespaceServices) {
                var service = namespaceServices[nsService];
                var namespace = namespaces[service].ns;
                services.push(namespace);
            }
			var loginData = {
				"clID": data.login,
				"pw": data.password,
				"options": {
					"version": "1.0",
					"lang": "en"
				},
				"svcs": {
					"objURI": services
				}
			};
            if (data.newPassword) {
                loginData.newPW = data.newPassword;
            }
			var xml = this.eppCommand({
				"login": loginData
			});
            return xml;
		},
        "logout" : function() {
            return this.eppCommand({"logout": null});
        },
		"checkDomain": function(data) {

		},
		"checkContact": function(data) {},
        // wrap EPP commands
        "eppCommand": function(data) {
            var command = {"command": [data, { "clTRID": "ABC-123"}]};
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

