var interval;
var getNewInterval = function myInterval() {
	return setInterval(function() {
		console.log("<HELLO>");
	},
	6000);

};

process.on('message', function(m) {
	if (interval) {
        console.log("Interrupting loop");
		clearInterval(interval);
	}
	console.log('child got message: ' , m);
	interval = getNewInterval();
});

