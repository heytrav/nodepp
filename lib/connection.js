var tls = require('tls');
var nb = require('network-byte-order');
module.exports = function(config) {
    var stream;
    return {
        "initStream": function() {
            try {
                var options = {
                    "host": config.host,
                    "port": config.port,
                    "rejectUnauthorized": false
                    //"secureProtocol": "SSLv3_method"
                };

                stream = tls.connect(options, function() {
                    console.log("Client connected");
                });

                //stream.setEncoding('utf8');
                stream.on('readable', function(data) {
                    var bigEndian = stream.read(4);
                    var xmlLength = bigEndian.readUInt32BE(0) - 4;
                    console.log("Length of xml: " + xmlLength);
                    stream.setEncoding('utf8');
                    var xml = stream.read();

                    console.log("EPP part: ", xml);
                    console.log("Length of xml is: " + xml.length);
                });
                stream.on('end', function() {
                    console.log("Got an end event");
                    server.close();
                });
            } catch(e) {
                console.log("Got error: ", e);
            }
        },
        // Receives stuff from the stream
        "receive": function(data) {
            return data;
        },
        // Pushes stuff into the stream
        "send": function(data) {},
        "parseEndian": function(rawResponse) {},
        "generateEndian": function(xml) {},
    };

};

