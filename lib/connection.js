var tls = require('tls');
var net = require('net');
var fs = require('fs');
var Q = require('q');
var nconf = require('nconf');
var moment = require('moment');
var winston = require('winston');

nconf.env()
var log_level = (nconf.get('LOG_LEVEL') || 'debug').toLowerCase();
var logger = new (winston.Logger)({
    transports: [
      new (winston.transports.Console)({ 
          "level": log_level,
          "json": true 
      })
    ]
});

function ProtocolConnection(config) {
    this.config = config;
    this.setStream(false);
}

ProtocolConnection.prototype.clientResponse = function(xml) {
    logger.info("Received: " + xml.toString('utf8'))
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
                "secureProtocol": "TLSv1_method"
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
                logger.debug("Read event");
                self.readStream();
            });
            newStream.on('clientError', function(exception, securePair) {
                deferred.reject(exception);
            });
            newStream.on('end', function() {
                logger.warn("Got an end event");
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
    streamBuffer = stream.read();
    if (streamBuffer !== null) {
        if (this.buffer === undefined) {
            this.buffer = streamBuffer;
        } else {
            this.buffer = Buffer.concat([this.buffer, streamBuffer]);
        }
        var bigEndian = this.buffer.slice(0, 4);
        var totalLength = new Buffer(bigEndian).readUIntBE(0, 4);
        var restOfBuffer = this.buffer.slice(4);
        var currentLength = this.buffer.length;
        logger.debug("endian length: ", totalLength);
        logger.debug("current buffer length", currentLength);
        if (this.buffer.length === totalLength || restOfBuffer.length === totalLength) {
            this.clientResponse(restOfBuffer);
            this.buffer = undefined;
        }
    }
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
    try {
        var preparedXML = this.processBigEndian(xml);
        logger.info(xml);
        this.stream.write(preparedXML, "utf8", function() {
            logger.info("Finished writing to server.");
        });
    } catch (e) {
        logger.error("Unable to write to stream.");
        deferred.reject(e);
    }
    return deferred.promise;
};
module.exports = ProtocolConnection;

