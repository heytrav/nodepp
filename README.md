#nodepp

An EPP implementation in node.js

##Description



##Install


1. Clone the repository and ```cd``` into it.
2. Run ```npm install```. This should install all the dependencies.
3. Run tests with ```npm test```.



##Running the service

Start the server in the background: ```npm start &```.

At this point the service should be running on localhost port 3000 and have
logged into Hexonet's test API. You can now make EPP requests by posting JSON
datastructures to ```http://localhost:3000/command/hexonet/<command>```.

I recommend using the program **Postman** which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice. I put an example of this down below.

At the time of this writing, the following commands have been implemented:

### Not running the service

    kill -INT `ps waux | grep server.j | grep -v grep | awk '{print $2}'`

Sorry, need to generate a ```.pid``` file. Put this in the *get around to
later* list.


### checkDomain


```{"domain": "something.com"}```

```{"domain": ["test-domain.com", "test-domain2.com", "test-domain3.com"]}```

### checkContact
### createContact


            {
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
            }

### infoContact
### infoDomain


## Example usage:

Post the following to http://localhost:3000/command/hexonet/checkDomain

    prompt$ time curl -H "Content-Type: application/json" -d '{"domain": "just-testing.com"}' http://localhost:3000/command/hexonet/checkDomain

_Note_ I just put ```time``` in there to show what the execution time is.  Currently for me from home it's taking about 0.491 sec for this request, but *YMMV*. This would probably be a little quicker in a country with modern internet.


You should get the following response (or something similar):

    {"epp":
    {"xmlns":"urn:ietf:params:xml:ns:epp-1.0"," xmlns:xsi":"http://www.w3.org/2001/XMLSchema-instance","xsi:schemaLocation":"urn:ietf:params:xml:ns:epp-1.0 epp-1.0.xsd",
    "response":{
        "result":{
            "code":1000,"msg":"Command completed successfully"},
            "resData":{
                "domain:chkData": {"xmlns:domain":"urn:ietf:params:xml:ns:domain-1.0","xsi:schemaLocation":"urn:ietf:params:xml:ns:domain-1.0 domain-1.0.xsd",
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
      }

I plan to get rid of some of the EPP cruft in the near future.






