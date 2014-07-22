var express = require("express");
var cp = require('child_process');
var nzrs = cp.fork(__dirname + '/worker.js');

var hexonetResponse = function(data) {
    console.log("============ Hexonet sent ===============");
    console.log(data);
};
nzrs.send({
    "registry": "hexonet",
});

var app = express();

//app.get('/login', function(req, res) {
    //nzrs.send({
        //"registry": "hexonet",
        //"command": "login",
        //"data": {
            //"login": "travis1",
            //"password": "9AmwVpV6DAnJVV2z"
        //}
    //});
//});
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

