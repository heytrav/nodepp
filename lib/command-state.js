module.exports = function() {
	return {
		"state": "offline",
		"resultOk": function(result) {
			if (result.status === 'OK') {
				return true;
			}
			return false;
		},

		// actions
		"login": function(credentials, callback) {
			// send login
			var result = this.command('login', credentials, callback);
			if (this.resultOk(result)) {
				this.state = 'connected';
			}
		},
		"logout": function() {
			var result = this.command('logout', callback);
		},
		"command": function(command, data, callback) {
			var result;
			try {
				result = callback(data);
			} catch(e) {
				console.log("Encountered an error");
			}
			return result;
		},

	};
};

