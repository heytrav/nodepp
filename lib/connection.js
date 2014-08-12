var tls = require('tls');
var net = require('net');
var fs = require('fs');

function ProtocolConnection(config) {
    this.config = config;
}

ProtocolConnection.prototype.clientResponse = function(xml) {
    console.log("Received: ", xml);
};
ProtocolConnection.prototype.setStream = function(newStream) {
    this.stream = newStream;
};
ProtocolConnection.prototype.initStream = function(onConnectCallback) {
    var self = this;
    var config = this.config;
    try {
        var newStream;
        if (config.ssl) { // encrypted connection
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
                console.info("Secure connection: ", newStream.authorized);
                onConnectCallback();
            });
        } else { // unencrypted connections
            var socket = new net.Socket();
            newStream = socket.connect(config.port, config.host, function() {
                onConnectCallback();
            });
        }
        newStream.on('readable', function() {
            var streamBuffer = this.read();
            var streamBufferLength = streamBuffer.length;
            if (streamBufferLength > 4) {
                var buffer = self.checkEndianLength(streamBuffer);
                self.clientResponse(buffer);
            } else {
                var bigEndian = streamBuffer.slice(0, 4);
                var totalLength = bigEndian.readUInt32BE(0);
                xmlLength = totalLength - 4;
            }
        });
        newStream.on('end', function() {
            console.log("Got an end event");
            server.close();
        });
        self.setStream(newStream);
    } catch(e) {
        throw e;
    }
};
ProtocolConnection.prototype.checkEndianLength = function checkEndianLength(buffer) {
    var bigEndian = buffer.slice(0, 4);
    var restOfBuffer = buffer.slice(4, null);
    var totalLength = bigEndian.readUInt32BE(0);
    var lengthWithoutEndian = totalLength - 4;
    if (buffer.length === totalLength || restOfBuffer.length === totalLength) {
        return restOfBuffer;
    }
    return buffer;

};
ProtocolConnection.prototype.prepareXML = function(xml) {
    var xmlBuffer = new Buffer(xml);

    var xmlLength = xml.length;
    var endianLength = xml.length + 4;
    var b = new Buffer(4);
    b.writeUInt32BE(endianLength, 0);
    var preppedXML = Buffer.concat([b, xmlBuffer]);
    return preppedXML;
};
ProtocolConnection.prototype.send = function(xml, clientResponse) {
    this.clientResponse = clientResponse;
    var preparedXML = this.prepareXML(xml);

    console.log("Calling write with ", preparedXML.toString());
    this.stream.write(preparedXML, "utf8", function() {
        console.log("Finished writing to server");
    });
};
module.exports = ProtocolConnection;

