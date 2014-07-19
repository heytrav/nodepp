var command_state = require('./command-state.js')();

module.exports = function() {

	return {
		"processMessage": function processMessage(m) {
			if (this.interval) {
				console.log("Interrupting loop");
				clearInterval(interval);
			}
			console.log('child got message: ', m);
			interval = command_state.login(m, function() {
				return {
					"status": "OK"
				};
			});
		}
	};
};

