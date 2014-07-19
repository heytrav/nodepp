var express = require("express");
var cp = require('child_process');
var n = cp.fork(__dirname + '/worker.js');
n.send({"start": "Time to wake up!"});



var app = express();


app.get('/people', function(req, res){
    res.send('Hello World!');
    n.send({"hello": "world"});
});


app.listen('3000');
