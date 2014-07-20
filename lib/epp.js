var convert = require('data2xml')();

module.exports = function () {
    return {
        "namespaces": {
            "epp": "epp.xml",
            "domain": "domain.xml",
            "contact": "contact.xml",
            "host": "host.xml"
        },
        "checkDomain": function(data) {

        },
        "checkContact": function (data) {
        },
        "eppWrapper": function(data ) {

        }
    };
};
