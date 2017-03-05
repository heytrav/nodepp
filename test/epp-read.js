var ProtocolConnection = require('../lib/connection.js'); // don't care about config atm
var fs = require('fs');
var Stream = require('stream').Readable;
var chai = require('chai');

var expect = chai.expect,
  should = chai.should;

describe('EPP socket connection handling', function() {
  var rawXML = '<?xml version="1.0" encoding="utf-8"?><epp xmlns="urn:ietf:params:xml:ns:epp-1.0"><hello/></epp>';
  var preparedXML;

  describe('writing EPP data to server', function() {
    it('should result in a string with xml length + 4', function() {
      var protocolConnection = new ProtocolConnection();
      preparedXML = protocolConnection.processBigEndian(rawXML);
      var length = preparedXML.length;
      expect(length).to.equal(rawXML.length + 4);
    });
  });

/*
 * TODO come back to this commit when I know how to test stream.
 */
});

