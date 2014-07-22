var command_state = require('./command-state.js');

var state;

module.exports = function() {

    return {
        "processMessage": function processMessage(m) {

            if (state) {
                if (m.command) {
                    //state.clientResponse = m.callback;
                    var command = m.command;
                    var data = m.data;
                    state.command(command, data, function() {
                        // send response back to parent process
                        return {"status": "OK"};
                    });
                }
            }
            else  {
                var registry = m.registry;
                console.log("Initialising state machine for registry: " , m);
                state = command_state(registry);
                state.connection.clientResponse = function (data) {
                    console.log("============= " + registry + " ================ ");
                    console.log(data);
                };
                state.connection.initStream();
            }
        
        }
    };
};

