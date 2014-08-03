var command_state = require('./command-state.js'),
    nconf = require('nconf');
nconf.env()
    .file({"file": "./lib/epp-config.json"});

var state;

module.exports = function() {

    return {
        "processMessage": function processMessage(m) {

            if (state) {
                if (m.command) {
                    //state.clientResponse = m.callback;
                    var command = m.command;
                    var data = m.data;
                    state.command(command, data, function(responseData) {
                        // send response back to parent process
                        //console.log("Would send back with response: ", responseData);
                        process.send(responseData);
                    });
                }
            }
            else { // Initialise a connection instance with registry configuration.
                var registry = m.registry;
                var registryConfig = nconf.get(registry);
                console.log("Registry config: ", registryConfig);
                state = command_state(registry, registryConfig);

                // Initialise the connection stream. Upon connection, attempt
                // to login.
                state.connection.initStream(function() {
                    console.log("Got connection");
                    setTimeout(function() {
                        state.command('login', {
                            "login": registryConfig.login,
                            "password": registryConfig.password
                        },
                        function(data) {
                            console.log("Log in callback received: ", data);
                        });
                    }, 2000);
                });
            }
        }
    };
};

