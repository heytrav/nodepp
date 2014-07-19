module.exports = function() {
	return {
		"state": "offline",
		"connected": false,
		"idle": function() {
			var self = this;
			this.state = 'idle';
			console.log("Called idle");
			this.interval = setInterval(function() {
				self.command('hello', null, function() {
					return {
						"status": "OK"
					};
				});
			},
			10000);
		},
		"resultOk": function(result) {
			if (result.status === 'OK') {
				return true;
			}
			return false;
		},

		// actions
		"login": function(credentials, callback) {
			console.log("Calling login: ", credentials);
			// send login
			var result = callback(credentials);
			if (this.resultOk(result)) {
				this.connected = true;
				this.idle();
			}
			return result;
		},
		"logout": function(callback) {
			var result = callback();
			if (this.resultOk(result)) {
				this.connected = false;
				if (this.interval) clearInterval(this.interval);
			}
			return result;
		},
		"hello": function() {

			console.log('<hello> </hello>');
			this.idle();
		},
		"command": function(command, data, callback) {
			console.log("Calling command: " + command + " data: ", data);
			var result;
			// TODO May have to check that we're not actually executing a
			// 'hello' command when this happens otherwise we could cause
			// a race condition.
			// stop hello loop
			if (this.interval && this.state === 'idle') clearInterval(this.interval);

			this.state = 'command';
			try {
				switch (command) {
				case 'login':
					result = this.login(data, callback);
					break;
				case 'logout':
					result = this.logout(callback);
					break;
				case 'hello':
					result = this.hello(callback);
					break;

				default:
					console.log("Not sure what we're doing here");
				}
			} catch(e) {
				console.log("Encountered an error: ", e);
			}
			return result;
		},

	};
};

