var tls = require('tls');
var net = require('net');
var fs = require('fs');
var moment = require('moment');

var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);

class ProtocolConnection {
    constructor(config) {
        this.config = config;
        this.setStream(false);
    }

    clientResponse(xml) {
        logger.debug("Received: " + xml.toString('utf8'))
    }
    setStream(newStream) {
        this.stream = newStream;
    }

    getStream() {
        return this.stream;
    }
    initStream() {
        return new Promise((resolve, reject) => {
            var config = this.config;

            if (!this.getStream()) {
                try {
                var newStream;
                var {host, port} = config;
                var options = {
                    host, 
                    port,
                    "rejectUnauthorized": false,
                    "secureProtocol": "TLSv1_method"
                };
                if (config.key) {
                    options.key = fs.readFileSync(config.key);
                }
                if (config.cert) {
                    options.cert = fs.readFileSync(config.cert);
                }

                logger.debug("Establishing connection..");
                newStream = tls.connect(options, () => {
                    let message = "Established a secure connection: " + host + ":" + port
                    logger.info(message, {host, port});
                    resolve(message)
                });
                newStream.on('readable', () => {
                    logger.debug("Read event");
                    this.readStream();
                });
                newStream.on('clientError', (exception, securePair) => {
                    reject(exception);
                });
                newStream.on('end', () => {
                    logger.error("Got an end event");
                    process.exit(1);
                });
                this.setStream(newStream);
                } catch (e) {
                    reject(e)
                }
            } else {
                resolve("Have stream already");
            }
        });
    }

    readStream() {
        try {
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
            var eppResponseBody = this.buffer.slice(4);
            var currentLength = this.buffer.length;
            logger.debug("endian length: ", totalLength);
            logger.debug("current buffer length", currentLength);
            if (this.buffer.length === totalLength || eppResponseBody.length === totalLength) {
                this.clientResponse(eppResponseBody);
                this.buffer = undefined;
            }
            }
        } catch (e) {
            logger.error(e);
        }
    }

    processBigEndian(xml) {
        var xmlBuffer = new Buffer(xml);

        var xmlLength = xmlBuffer.length;
        var endianLength = xmlLength + 4;
        var b = new Buffer(4);
        b.writeUInt32BE(endianLength, 0);
        var preppedXML = Buffer.concat([b, xmlBuffer]);
        return preppedXML;
    }

    send(xml) {
        return new Promise((resolve, reject) => {
            // Called in "readStream()" when the stream gets input from EPP server.
            this.clientResponse = function(buffer) {
                resolve(buffer);
            };
            try {
                var preparedXML = this.processBigEndian(xml);
                logger.debug(xml);
                this.stream.write(preparedXML, "utf8", function() {
                logger.debug("Finished writing to server.");
                });
            } catch (e) {
                logger.error("Unable to write to stream.");
                reject(e);
            }
        });
    }

}

module.exports = ProtocolConnection;

