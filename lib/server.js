var express = require("express");
var cp = require('child_process');
var n = cp.fork(__dirname + '/worker.js');

n.send({"login": {"login": "user1", "password": "xyz123"}});

var app = express();


app.get('/check-domain', function(req, res){
    n.send({"check_domain": {"domain": "whatever.com"} });
});

app.get('/check-contact', function(req, res) {
    n.send({"check_contact": {"contact": "P-12345"}});
});

app.listen('3000');
