var command_state = require('./command-state.js');
var configuration = require('./epp-config.json');

var state;

module.exports = function() {

	return {
		"processMessage": function processMessage(m) {

			if (state) {
				if (m.command) {
					//state.clientResponse = m.callback;
					var command = m.command;
					var data = m.data;
					state.command(command, data, function() {
						// send response back to parent process
						return {
							"status": "OK"
						};
					});
				}
			}
			else { // Initialise a connection instance with registry configuration.
				var registry = m.registry;
				var registryConfig = configuration[registry];
				console.log("Initialising connection state for registry: ", m);
				state = command_state(registry, registryConfig);
				state.connection.clientResponse = function(data) {
					console.log("============= " + registry + " ================ ");
					console.log(data);
				};
                // Initialise the connection stream. Upon connection, attempt
                // to login.
				state.connection.initStream(function() {
					state.command('login', {
						"login": registryConfig.login,
						"password": registryConfig.password
					},
					function() {});
				});
			}

		}
	};
};

