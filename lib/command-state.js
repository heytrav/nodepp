module.exports = function() {
	return {
		"state": "offline",

		// actions
		"login": function(credentials) {
			// send login
			var result = this.command('login', callback, credentials);
			if (true) {
				this.state = 'connected';
			}
		},
		"logout": function() {
			var result = this.command('logout', callback);
		},
		"command": function(command, callback, data) {
			var result;
			try {
				result = callback(data);
			} catch(e) {
				/* handle error */
			}
		},

	};
};

