var command_state = require('./command-state.js')();

module.exports = function() {

	return {
		"processMessage": function processMessage(m) {
			console.log('child got message: ', m);
            var command = Object.keys(m)[0];
            var data = m[command];
            command_state.command(command, data, function() {
                return {"status": "OK"};
            });
		}
	};
};

