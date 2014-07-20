var convert = require('data2xml')();
var fs, configurationfile;
configurationFile = './lib/epp-config.json';
fs = require('fs');
var configuration = JSON.parse(
fs.readFileSync(configurationFile));

module.exports = function(registry) {
	return {
		"config": configuration[registry],
		"login": function(data) {
			var loginData = {
				"clID": data.login,
				"pw": data.password,
				"options": {
					"version": "1.0",
					"lang": "en"
				},
				"svcs": {
					"objURI": ['a', 'b', 'c']
				}
			};
			var xml = this.epp_wrapper({
				"login": loginData
			});
		},
		"checkDomain": function(data) {

		},
		"checkContact": function(data) {},
		"eppWrapper": function(data) {
			var xml = convert("epp", {
				"_attr": {
					"xmlns": this.config.namespaces.epp.ns
				},
				"command": [data, {"clTRID": "ABC-123"}]
			});

		}
	};
};

