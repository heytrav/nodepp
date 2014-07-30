#nodepp

An EPP implementation in node.js

##Description

A _service_ for communicating with EPP registries(ars).

### What it is

Just something to handle the communication with registries over EPP. It
takes datastructures in JSON, converts them to XML, sends them to the
registry, and then does the whole thing in reverse with the response. You
should get back something in JSON format.

### What it isn't

It doesn't know anything about business logic; neither ours, nor the
registries'. Inevitably we want to be able to use this code with more than one
registry and tailoring to each one of them is impractical.  Where possible,
I've tried to do some validation with respect to the EPP documentation.

Some of the required datastructures might seem a bit weird. EPP has a fairly
complex grammar that is _probably_ intended to make granular control of
domain related entities easier. There are no flat datastructures and some
things must be specified explicitly that would be assumed in systems like
the Hexonet API. For example, to remove nameservers from a domain, it is
necessary to remove them explicitly. Simply updating domain with _the new
nameservers_ will not work. The same goes for contact objects.

##Install


1. Clone the repository and ```cd``` into it.
2. Run ```npm install```. This should install all the dependencies.
3. Run tests with ```npm test```.



##Running the service

Start the server in the background: ```npm start &```.

At this point the service should be running on localhost port 3000 and have
logged into Hexonet's test API. You can now make EPP requests by posting JSON
datastructures to ```http://localhost:3000/command/hexonet/<command>```.  Note
that this is to an OTE account (```travis1```) and may not reflect live data.

I recommend using the program **Postman** which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice. I put an example of this down below.

## Not running the service

    kill -INT `ps waux | grep server.js | grep -v grep | awk '{print $2}'`

Sorry, need to generate a ```.pid``` file. Put this in the *get around to
later* list.

## Commands

At the time of this writing, the following commands have been implemented:


### checkContact

```{"id": "P-12345xyz"}```


### infoContact

```{"id": "P-12345xyz"}```



### createContact


            {
                "id": "my-id-1234",
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

Some registries set the ```id``` by default. In such cases it's common to use
```auto```. The value for ```type``` may also vary for different
registries. Some require ```loc``` and some require ```int```. EPP allows for
up to 2 entries in this field, however I've never seen a registry that accepts
more than 1.

### infoDomain

```{"domain": "something.com"}```

### checkDomain


```{"domain": "something.com"}```

```{"domain": ["test-domain.com", "test-domain2.com", "test-domain3.com"]}```

### createDomain

             {
                "name": "test-domain.com",
                "period": {
                    "unit": "y",
                    "value": 2
                },
                "ns": ["ns1.example.net", "ns2.example.net"],
                "registrant": "P-12345",
                "contact": [{ "admin": "P-12345" }, { "tech": "P-12346" }, ],
                "authInfo": {
                    "pw": "Axri3kjp"
                }
            };

### updateDomain

            {
                "name": "test-domain.com",
                "add": {
                    "ns": ["ns3.test.com", "ns4.whatever.com"],
                    "contact": [{
                        "admin": "P-9876"
                    },
                    {
                        "billing": "PX143"
                    }],
                    "status": ["clientUpdateProhibited", {
                        "s": "clientHold",
                        "lang": "en",
                        "value": "Payment Overdue"
                    }]
                },
                "rem": {
                    "ns": [{
                        "host": "ns1.test-domain.com",
                        "addr": {
                            "type": "v4",
                            "ip": "192.68.2.132"
                        }
                    }],
                    "contact": [{
                        "billing": "PX147"
                    }],
                    "status": ["clientTransferProhibited", {
                        "s": "clientWhatever",
                        "lang": "en",
                        "value": "Payment Overdue"
                    }]
                },
                "chg": {
                    "registrant": "P-49023",
                    "authInfo": {
                        "pw": "TestPass2"
                    }
                }
            }

This is a very complicated example. At least 1 of ```add```, ```rem```, or ```chg``` is required.



## General stuff

### Host objects

In *createDomain* and *updateDomain* I've tried to account for 2 different
types of host objects. In the simplest version you can just pass an array of
strings:

    ["ns1.host.com", "ns2.host.co.nz"]

In cases where IP addresses are required, the following variants can be used:

    [{host: "ns1.host.com", addr: "62.47.23.1"}]
    [{host: "ns2.host.com", addr:[ "62.47.23.1", {ip: "53.23.1.3"}    ]}]
    [{host: "ns3.host.com", addr:[ {ip: "::F3:E2:23:::", type: "v6"}, {ip:"47.23.43.1", type: "v4"} ]}]

It's up to you to know which cases glue records are required. This
implementation has no way to know that.

### authInfo

*createContact*, *createDomain*, *transferDomain* and a few others accept an
```authInfo``` parameter.

Following are equivalent:

    authInfo: "te2tP422t"

or

    authInfo: {
        pw: "te2tP422t"
    }

In some cases you may need to supply a ```roid``` in addition to the
```authInfo```. I think this is supposed to contain a registrant id.

    authInfo: {
            pw: "te2tP422t",
            roid: "P-1234"
    }


### period

The ```period``` argument can be specified as follows:

1 year registration

```period: 1```

24 month registration

```
period: {
unit: "m",
        value: 24
}
```

The default unit is _y_ for year and default period is 1.


## Example usage:

Post the following to http://localhost:3000/command/hexonet/checkDomain

    prompt$ time curl -H "Content-Type: application/json" -d '{"domain": "just-testing.com"}' http://localhost:3000/command/hexonet/checkDomain

_Note_ I just put ```time``` in there to show what the execution time is.
*YMMV*


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






