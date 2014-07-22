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

                newStream.on('readable',function () {
                    var bigEndian = this.read(4);
                    console.log("Got: ", bigEndian);
                    var xmlLength = bigEndian.readUInt32BE(0) - 4;
                    //this.setEncoding('utf8');
                    var xml = this.read();
                    console.log("Server response: ", xml.toString("utf8"));

                    console.log("client response: ", self.clientResponse);
                    self.clientResponse(xml);

                });
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
        },
        "prepareXML": function(xml) {
            //console.log("Converting: ", xml);
            var xmlBuffer = new Buffer(xml);

            var xmlLength = xml.length;
            var endianLength = xml.length + 4;
            var b = new Buffer(4);
            console.log("Write out as bigendian", b);
            b.writeUInt32BE(endianLength, 0);
            var preppedXML = Buffer.concat([b, xmlBuffer]);
            return preppedXML;
        },
        // Pushes stuff into the stream
        "send": function(xml) {
            var preparedXML = this.prepareXML(xml);

            console.log(preparedXML.toString("utf8"));
            stream.write(preparedXML, "utf8", function () {
                console.log("Finished writing to server");
            });


        },
        "parseEndian": function(rawResponse) {},
        "generateEndian": function(xml) {},
    };

};

