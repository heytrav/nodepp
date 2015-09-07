var tls = require('tls');
var net = require('net');
var fs = require('fs');
var Q = require('q');
var moment = require('moment');
var winston = require('winston');
var logger = new winston.Logger();

function ProtocolConnection(config) {
    this.config = config;
    this.setStream(false);
}

ProtocolConnection.prototype.clientResponse = function(xml) {
    logger.debug("Received: " + xml.toString('utf8'))
};
ProtocolConnection.prototype.setStream = function(newStream) {
    this.stream = newStream;
};
ProtocolConnection.prototype.getStream = function() {
    return this.stream;
};
ProtocolConnection.prototype.initStream = function() {
    var self = this;
    var deferred = Q.defer();
    var config = this.config;

    if (! self.getStream()) {
        try {
            var newStream;
            var options = {
                "host": config.host,
                "port": config.port,
                "rejectUnauthorized": false,
                "secureProtocol": "TLSv1_method"//"SSLv3_method"
            };
            if (config.key) {
                options.key = fs.readFileSync(config.key);
            }
            if (config.cert) {
                options.cert = fs.readFileSync(config.cert);
            }

            logger.info("Establishing connection..");
            newStream = tls.connect(options, function() {
                logger.info("Established a secure connection.");
                deferred.resolve();
            });
            newStream.on('readable', function () {
                self.readStream();
            });
            newStream.on('clientError', function(exception, securePair) {
                deferred.reject(exception);
            });
            newStream.on('end', function() {
                logger.debug("%s :Got an end event", moment());
                self.setStream(false);
            });
            self.setStream(newStream);
        } catch(e) {
            deferred.reject(e);
        }
    } else {
        deferred.resolve();
    }
    return deferred.promise;
};

ProtocolConnection.prototype.readStream = function () {
    var stream = this.stream;
    var streamBuffer = stream.read();
    var streamBufferLength = streamBuffer.length;
    if (streamBufferLength > 4) {
        var buffer = this.checkEndianLength(streamBuffer);
        this.clientResponse(buffer);
    }
};

ProtocolConnection.prototype.checkEndianLength = function checkEndianLength(buffer) {
    var bigEndian = buffer.slice(0, 4);
    var restOfBuffer = buffer.slice(4);
    var totalLength = bigEndian.readUInt32BE(0);
    var lengthWithoutEndian = totalLength - 4;
    if (buffer.length === totalLength || restOfBuffer.length === totalLength) {
        return restOfBuffer;
    }
    return buffer;
};
ProtocolConnection.prototype.processBigEndian = function(xml) {
    var xmlBuffer = new Buffer(xml);

    var xmlLength = xmlBuffer.length;
    var endianLength = xmlLength + 4;
    var b = new Buffer(4);
    b.writeUInt32BE(endianLength, 0);
    var preppedXML = Buffer.concat([b, xmlBuffer]);
    return preppedXML;
};
ProtocolConnection.prototype.send = function(xml) {
    var deferred = Q.defer();
    // Called in "readStream()" when the stream gets input from EPP server.
    this.clientResponse = function(buffer) {
        deferred.resolve(buffer);
    };
    var preparedXML = this.processBigEndian(xml);
    winston.log(preparedXML.toString());
    this.stream.write(preparedXML, "utf8", function() {
        //console.log("Finished writing to server");
    });
    return deferred.promise;
};
module.exports = ProtocolConnection;

