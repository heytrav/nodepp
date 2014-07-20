var express = require("express");
var cp = require('child_process');
var nzrs = cp.fork(__dirname + '/worker.js');

var hexonet = cp.fork(__dirname + '/worker.js');

nzrs.send({
    "registry": "nzrs",
    "command": "login",
	"data": {
		"login": "user1",
		"password": "xyz123"
	}
});

hexonet.send({
    "registry": "hexonet",
    "command": "login",
	"data": {
		"login": "user1",
		"password": "xyz123"
	}
});


var app = express();

app.get('/check-domain', function(req, res) {
	nzrs.send({
        "command": "checkDomain",
		"data": {
			"domain": "whatever.com"
		}
	});
});

app.get('/check-contact', function(req, res) {
	nzrs.send({
        "command": "checkContact",
		"data": {
			"contact": "P-12345"
		}
	});
});

app.listen('3000');

