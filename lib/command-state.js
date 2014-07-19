module.exports = function() {
	return {
		"state": "offline",
		"connected": false,
		"idle": function() {
			var self = this;
			this.state = 'idle';
			console.log("Called idle");
			this.interval = setInterval(function() {
				console.log("Called interval");
				self.hello();
			},
			2000);
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
			var result = this.command('login', credentials, callback);
            if (this.resultOk(result)) {
                this.connected = true;
                this.idle();
            }
            return result;
		},
		"logout": function(callback) {
			var result = this.command('logout', null, callback);
            if (this.resultOk(result)) {
                this.connected = false;
                if (this.interval)
                    clearInterval(this.interval);
            }
			return result;
		},
		"hello": function() {
			var result = this.command('hello', function() {
				console.log("Executing '<hello> </hello>'");
			});
			return result;
		},
		"command": function(command, data, callback) {
			var result;
			// TODO May have to check that we're not actually executing a
			// 'hello' command when this happens otherwise we could cause
			// a race condition.
			// stop hello loop
			if (this.interval && this.state === 'idle') clearInterval(this.interval);

			this.state = 'command';
			try {

				result = callback(data);
                //if (this.resultOk(result)) {
                    //switch (command) {
                    //case 'login':

                        //break;
                    //case 'logout':

                        //break;
                    //case 'check_domain':

                        //break;

                    //default:
                        //this.idle();
                    //}
                //}

			} catch(e) {
				console.log("Encountered an error: ", e);
			}
			return result;
		},

	};
};

