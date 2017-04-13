var EppFactory = require('../lib/epp-factory.js');
var ProtocolConnection = require('./connection.js');
var parser = require('xml2json');
var moment = require('moment');

var nconf = require('./utilities/config.js').getConfig();
var logger = require('./utilities/logging.js').getLogger(nconf);

var currRegistry;

class ProtocolState {
    constructor(registry, config) {
        currRegistry = registry;
        this.epp = EppFactory.generate(registry, config);
        this.connection = new ProtocolConnection(config);
        this.state = "offline";
        this.loggedIn = false;
    }

    idle() {
        this.state = 'idle';
        this.interval = setInterval(() => {
            var now = moment();
            if (!this.last || now.diff(this.last, 'seconds') > 60) {
                logger.debug("It's been 60 seconds, calling hello for " + currRegistry);
                if (this.loggedIn) {
                    this.command('hello', null, 'fake').then((helloResponse) => {
                        logger.debug("Hello got response: ", helloResponse.toString());
                    },
                        (error) => {
                            logger.error("Hello got error: ", error);
                        });
                } else {
                    logger.warn("Logged out. Can't send <hello/>");
                }
            }
        },
            5000);
    }

    resultOk(result) {
        if (result.status === 'OK') {
            return true;
        }
        return false;
    }

    processResponse(eppJson) {
        var eppData = eppJson.epp;
        if (eppData) {
            var {response} = eppData;
            if (response) {
                var {result} = response;
                if (result.msg && result.msg && typeof result.msg === 'object') {
                    logger.debug("throw away lang attribute");
                    result.msg = result.msg["$t"];
                }
                var returnData = {
                    "result": result,
                    "data": response.resData,
                    "transactionId": response.trID
                };
                if (response.hasOwnProperty('msgQ')) {
                    returnData.msgQ = response.msgQ;
                }

                return returnData;
            }
            return eppData;
        }
        return eppJson;
    }

    processReturnedXML(returnedXML) {
        var response = parser.toJson(returnedXML, {
            "object": true
        });
        logger.debug(returnedXML.toString());
        var processedResponse = this.processResponse(response);
        if (processedResponse && processedResponse.result) {
            var result = processedResponse.result;
            logger.debug("Processed response", processedResponse);
            return processedResponse;
        }
    }

    login(data, transactionId) {

        return this.command('login', data, transactionId).then((data) => {
            var result = data.result;

            if (result.hasOwnProperty('code') && result.code < 2000) {
                logger.debug("Logged in successfully.");
                this.loggedIn = true;
            }
            return data;
        },
        (error) =>  {
            throw new Error(error);
        });
    }

    command(command, data, transactionId) {
        if (this.interval) {
            clearInterval(this.interval);
        }

        this.state = 'command';
        var eppCommand = this.epp[command];
        var xml;
        try {
            if (!eppCommand) {
                throw new Error("Unknown EPP command");
            }
            xml = this.epp[command](data, transactionId);
        } catch (e) {
            if (this.state !== 'idle') {
                this.idle();
            }
            throw e;
        }
        // This is a promise
        return this.connection.send(xml).then((buffer) => {
            this.last = moment();
            if (command !== 'logout') {
                this.idle();
                if (command === 'login') {
                    this.loggedIn = true;
                }
            } else {
                this.loggedIn = false;
                logger.debug("Logged out");
                if (data.kill) {
                    logger.warn("Logged out and killing child process.");
                    process.exit(0);
                }
            }
            return this.processReturnedXML(buffer);
        },
        (error) => {
            logger.error(error);
            this.loggedIn = false;
        });
    }
}


module.exports = ProtocolState;

