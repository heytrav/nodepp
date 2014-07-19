var convert = require('data2xml')();

module.exports = function () {
    return {
        "namespaces": {
            "epp": "epp.xml",
            "domain": "domain.xml",
            "contact": "contact.xml",
            "host": "host.xml"
        },
        "check_domain": function(data) {

        },
        "check_contact": function (data) {
        }
    };
};
