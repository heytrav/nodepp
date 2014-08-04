var forever = require('forever-monitor'),
    nconf = require('nconf');
nconf.env();
console.log("Got environment: ", nconf.get('EPP_REGISTRIES'));

var child = new(forever.Monitor)('./lib/server.js', {
    max: 1,
    silent: true,
    pidFile: "nodepp.pid",
    logFile: "nodepp.log",
    outFile: "node-stout.log",
    errFile: "nodepp-sterr.log",
    options:['--registries', 'hexonet-test1', '--registries', 'nzrs-test1', '--registries', 'nzrs-test2']

});
child.on('exit', function() {
    console.log("the program has exited.");
});

child.start();
