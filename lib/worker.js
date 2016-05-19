var Dispatcher = require('./dispatcher.js');
var dispatch = new Dispatcher();

process.on('message', dispatch.processMessage);
process.on('SIGINT', function(err) {
    console.log("Try to logout.");
    setTimeout(function() {
        process.exit(0);
    }, 2000);
    process.send({
        "command": "logout",
        "data": {"kill": true}
    });
});

