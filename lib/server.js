var express = require("express");
var cp = require('child_process');
var n = cp.fork(__dirname + '/worker.js');
n.send({"start": "Time to wake up!"});
var app = express();


app.get('/check-domain', function(req, res){
    n.send({"command": "check_domain" });
});

app.get('/check-contact', function(req, res) {
    n.send({"command": "check_contact" });
});

app.listen('3000');
