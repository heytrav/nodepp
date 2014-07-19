var interval;
exports.helloIntervals = function helloIntervals() {
	return setInterval(function() {
		console.log("<hello></hello>");
	},
	6000);
};
module.exports = function() {
	return {

		"processMessage": function processMessage(m) {
			if (this.interval) {
				console.log("Interrupting loop");
				clearInterval(interval);
			}
			console.log('child got message: ', m);
			interval = exports.helloIntervals();
		}
	};
};

