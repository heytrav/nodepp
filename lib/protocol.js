var state_machine = require('./command-state.js');

var command_state;

module.exports = function() {

    return {
        "processMessage": function processMessage(m) {
            if (! command_state) {
                var registry = m.registry;
                console.log("Initialising state machine for registry: " + registry);
                command_state = state_machine(registry);
            }
            var command = m.command;
            var data = m.data;
            command_state.command(command, data, function() {
                return {"status": "OK"};
            });
        }
    };
};

