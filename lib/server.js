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

app.get('/hexonet/:command/:domain', function(req, res) {
    nzrs.on('message', function(m) {
        console.log('Getting input from child: ', m);
        res.write(m);
        res.end();
    });
    nzrs.send({
        "command": req.params.command,
        "data": {
            "domain": req.params.domain
        },
    });
    console.log("We're all done");
});

app.listen('3000');

