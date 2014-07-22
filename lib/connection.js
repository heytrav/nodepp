var tls = require('tls');
module.exports = function(config) {
    var stream;
    return {
        "setStream": function(newStream) {
            stream = newStream;
        },
        "initStream": function() {
            var self = this;
            try {
                var options = {
                    "host": config.host,
                    "port": config.port,
                    "rejectUnauthorized": false,
                    "secureProtocol": "SSLv3_method"
                };

                var newStream = tls.connect(options, function() {
                    console.log("Client connected");
                });
                self.setStream(newStream);

                newStream.on('readable', this.receive);
                newStream.on('end', function() {
                    console.log("Got an end event");
                    server.close();
                });
            } catch(e) {
                console.log("Got error: ", e);
            }
        },
        // Receives stuff from the stream
        "receive": function(data) {
            var bigEndian = stream.read(4);
            var xmlLength = bigEndian.readUInt32BE(0) - 4;
            stream.setEncoding('utf8');
            var xml = stream.read();
            return xml;
        },
        // Pushes stuff into the stream
        "send": function(data) {},
        "parseEndian": function(rawResponse) {},
        "generateEndian": function(xml) {},
    };

};

