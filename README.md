#nodepp

An EPP implementation in node.js

##Description

An EPP implementation in node.js.


##Install


1. Clone the repository and ```cd``` into it.
2. Run ```npm install```. This should install all the dependencies.
3. Run tests with ```npm test```.



##Running the service

Start the server in the background: ```npm start &```.

At this point the service should be running on localhost port 3000 and have
logged into Hexonet's test API. You can now make EPP requests by posting JSON
datastructures to ```http://localhost:3000/command/hexonet/<command>```.

I recommend using the program *Postman* which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice.

At the time of this writing, the following commands have been implemented:

### checkDomain


```{"domain": "something.com"}```

```{"domain": ["test-domain.com", "test-domain2.com", "test-domain3.com"]}```

### checkContact
### createContact


```{
                "id": "auto",
                "voice": "+1.9405551234",
                "fax": "+1.9405551233",
                "email": "john.doe@null.com",
                "authInfo": {
                    "pw": "xyz123"
                },
                "postalInfo": [{
                    "name": "John Doe",
                    "org": "Example Ltd",
                    "type": "int",
                    "addr": [{
                        "street": ["742 Evergreen Terrace", "Apt b"],
                        "city": "Springfield",
                        "sp": "OR",
                        "pc": "97801",
                        "cc": "US"
                    }]
                }]
            }```

### infoContact
### infoDomain


Example usage:

Post the following to http://localhost:3000/command/hexonet/checkDomain

   ```curl -H "Content-Type: application/json" -d '{"domain": "just-testing.com"}' http://localhost:3000/api/login```



You should get the following response (or something similar depending how far
along I am with handling the response):

```{"epp":
    {"xmlns":"urn:ietf:params:xml:ns:epp-1.0"," xmlns:xsi":"http://www.w3.org/2001/XMLSchema-instance","xsi:schemaLocation":"urn:ietf:params:xml:ns:epp-1.0 epp-1.0.xsd",
    "response":{
        "result":{
            "code":1000,"msg":"Command completed successfully"},
            "resData":{
                "domain:chkData": {" xmlns:domain":"urn:ietf:params:xml:ns:domain-1.0","xsi:schemaLocation":"urn:ietf:params:xml:ns:domain-1.0 domain-1.0.xsd",
                "domain:cd":{
                    "domain:name":{
                        "avail":0,"$t":"catalyst.com"
                        },
                    "domain:reason":"Domain exists"
                    }
                }
            },
        "trID":{
            "clTRID":"test-check-1234",
            "svTRID":"RO-5734-1406529047908280"
            }
        }
        }
    }```

I plan to get rid of some of the EPP cruft surrounding in there in the future.






