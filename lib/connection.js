var tls = require('tls');
var net = require('net');
var fs = require('fs');
module.exports = function(config) {
    var stream;
    return {
        "clientResponse": function(xml) {
            console.log("Received: ", xml);
        },
        "setStream": function(newStream) {
            stream = newStream;
        },
        "endianRead": 0,
        "initStream": function(onConnectCallback) {
            var self = this;
            try {
                var newStream;
                if (config.ssl) {

                    var options = {
                        "host": config.host,
                        "port": config.port,
                        "rejectUnauthorized": false,
                        "secureProtocol": "SSLv3_method"
                    };
                    if (config.key) {
                        options.key = fs.readFileSync(config.key);
                    }
                    if (config.cert) {
                        options.cert = fs.readFileSync(config.cert);
                    }

                    newStream = tls.connect(options, function() {
                        console.log("Client connected securely: ", newStream.authorized);
                        onConnectCallback();
                    });
                    self.setStream(newStream);
                } else {
                    var socket = new net.Socket();
                    newStream = socket.connect(config.port, config.host, function() {
                        console.log("Client connected insecurely");
                        self.setStream(this);
                        onConnectCallback();
                    });
                }
                newStream.on('readable', function() {
                    var streamBuffer = this.read();
                    console.log("Stream received: ", streamBuffer.toString());
                    var xmlLength;
                    if ( self.endianRead !== 0) {
                        xmlLength = self.endianRead;
                        self.endianRead = 0;
                    } else {
                        var bigEndian = streamBuffer.slice(null,4);
                        console.log("big endian: ", bigEndian);
                        var totalLength = bigEndian.readUInt32BE(0);
                        xmlLength = totalLength - 4;
                    }

                    console.log("xml length is: ", xmlLength);
                    //this.setEncoding('utf8');
                    var xml = streamBuffer.slice(0, null );
                    console.log("Received in event: ", xml.toString());
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
        "prepareXML": function(xml) {
            var xmlBuffer = new Buffer(xml);

            var xmlLength = xml.length;
            var endianLength = xml.length + 4;
            var b = new Buffer(4);
            b.writeUInt32BE(endianLength, 0);
            var preppedXML = Buffer.concat([b, xmlBuffer]);
            return preppedXML;
        },
        // Pushes stuff into the stream
        "send": function(xml, clientResponse) {
            this.clientResponse = clientResponse;
            var preparedXML = this.prepareXML(xml);

            console.log("Calling write with ", preparedXML.toString());
            stream.write(preparedXML, "utf8", function() {
                console.log("Finished writing to server");
            });
        }
    };

};

