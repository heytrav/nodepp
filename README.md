nodepp
======

An EPP implementation in node.js

Description
===========

An EPP implementation in node.js.


Notes
=====


When the service is running, it should be possible to POST json data
structures and get json responses back.  As I've been developing, I've been
running the service on aldo.domarino.com quite a bit.


Example usage:

Post** the following to http://aldo.domarino.com:3000/command/hexonet/checkDomain

{"domain": "just-testing.com"}



You should get the following response (or something similar depending how far
along I am with handling the response):

{"epp":{"xmlns":"urn:ietf:params:xml:ns:epp-1.0"," xmlns:xsi":"http://www.w3.org/2001/XMLSchema-instance","xsi:schemaLocation":"urn:ietf:params:xml:ns:epp-1.0 epp-1.0.xsd","response":{"result":{"code":1000,"msg":"Command completed successfully"},"resData":{"domain:chkData":{" xmlns:domain":"urn:ietf:params:xml:ns:domain-1.0","xsi:schemaLocation":"urn:ietf:params:xml:ns:domain-1.0 domain-1.0.xsd","domain:cd":{"domain:name":{"avail":0,"$t":"catalyst.com"},"domain:reason":"Domain exists"}}},"trID":{"clTRID":"test-check-1234","svTRID":"RO-5734-1406529047908280"}}}}






** I recommend using the program "Postman" which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice.
