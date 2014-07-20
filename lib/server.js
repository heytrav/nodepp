var express = require("express");
var cp = require('child_process');
var nzrs = cp.fork(__dirname + '/worker.js');

nzrs.send({
	"login": {
		"login": "user1",
		"password": "xyz123"
	}
});


var app = express();

app.get('/check-domain', function(req, res) {
	nzrs.send({
		"checkDomain": {
			"domain": "whatever.com"
		}
	});
});

app.get('/check-contact', function(req, res) {
	nzrs.send({
		"checkContact": {
			"contact": "P-12345"
		}
	});
});

app.listen('3000');

