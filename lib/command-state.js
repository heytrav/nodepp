module.exports = function() {
	return {
		"state": "offline",
		"connected": false,
        "idle" : function () {
            var self = this;
            this.interval = setInterval(function() {

            }, 2000);
        },
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
			return result;
		},
		"hello": function(callback) {
			var result = this.command('hello', callback);
			return result;
		},
		"command": function(command, data, callback) {
			var result;
            this.state = 'command';
			try {
                // stop hello loop
                // TODO May have to check that we're not actually executing a
                // 'hello' command when this happens otherwise we could cause
                // a race condition.
                if (this.interval) clearInterval(this.interval);

				result = callback(data);

				switch (command) {
				case 'login':

					break;
				case 'logout':
					this.state = 'offline';

					break;

				default:
                    this.idle();

				}
			} catch(e) {
				console.log("Encountered an error: ", e);
			}
			return result;
		},

	};
};

