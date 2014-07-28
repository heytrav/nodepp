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
					var streamBufferLength = streamBuffer.length;
					console.log("Buffer length: ", streamBufferLength);

					if (streamBufferLength > 4) {
                        var buffer = self.checkEndianLength(streamBuffer);
						console.log("Got string: ", buffer.toString());
						self.clientResponse(buffer);
					} else {
						var bigEndian = streamBuffer.slice(0, 4);
						console.log("big endian: ", bigEndian);
						var totalLength = bigEndian.readUInt32BE(0);
						xmlLength = totalLength - 4;
                        console.log("XML message ", xmlLength);
					}

				});
				newStream.on('end', function() {
					console.log("Got an end event");
					server.close();
				});
			} catch(e) {
				console.log("Got error: ", e);
			}
		},
		/*
         * Check that if the first 4 bytes are possibly a big endian 
         * number representing the length of the rest of the XML.
         * If not return the whole buffer. If yes, return the part after the
         * endian representation.
         */
		"checkEndianLength": function checkEndianLength(buffer) {
			var bigEndian = buffer.slice(0, 4);
			var restOfBuffer = buffer.slice(4, null);
			var totalLength = bigEndian.readUInt32BE(0);
            console.log("big endian length: ", totalLength);
			var lengthWithoutEndian = totalLength - 4;
			if (buffer.length === totalLength || restOfBuffer.length === totalLength) {
                console.log("Returning shortened buffer.");
				return restOfBuffer;
			} 
            console.log("Returning full buffer.");
			return buffer;

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

