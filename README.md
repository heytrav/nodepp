#nodepp

An EPP implementation in node.js

[![Docker Repository on Quay.io](https://quay.io/repository/heytrav/nodepp/status "Docker Repository on Quay.io")](https://quay.io/repository/heytrav/nodepp)

[![Build Status](https://drone.io/github.com/heytrav/nodepp/status.png)](https://drone.io/github.com/heytrav/nodepp/latest)

##Description

This is a service for communicating with registries over EPP. It
takes datastructures in JSON, converts them to XML, sends them to the
registry, and then does the whole thing in reverse with the response.

There are two separate server scripts:

1. `lib/server.js` is designed to function as a RESTful interface where you can
   POST and receive json requests.
2. `lib/rabbit-epp.js`, runs as an RPC server that accepts requests via RabbitMQ.

## Installation


1. Clone the repository: `git clone https://github.com/heytrav/nodepp.git`.
2. `cd nodepp`
3. `npm install` to install node dependencies.
4.  `source nodepp.rc` to include `./node_modules/.bin` in the
    `$PATH`. This is necessary for testing or if you plan on running it as
    a daemon.

## Configuration

In `config/epp-config-example.json` you'll find something that looks like
this:

```javascript
{
    "registries": {
        "registry-test1": {
          // registry1 data
        },
        "registry-test2": {
          // registry2
        }
    },
    "rabbitmq": {
        "connection": {
          // RabbitMQ connection
        }
    },
    "whitelisted_ips": []
}
```

For your development and production environments, I recommend copying this
file to `config/epp-config-devel.json` and
`config/epp-config-production.json`, respectively, and modifying each to
fit your needs.  You will need to add your own login/password as well as the
paths to any SSL certificates and keys. You can of course replace the keys
`registry-test1`, `registry-test2`, etc. with something more intuitive.

When you've got the config setup the way you like it, symlink this to
`config/epp-config.json` to run the application.

    ln -s <path to app>/config/epp-config-devel.json <path to app>/config/epp-config.json


You can add as many registries as you like. You may even need to add the same
registry multiple times with different logins, etc. This is practical for
testing if you need to simulate transferring domains between two separate
registrars.

The `rabbitmq` section of the config is necessary if you would like to run the
`lib/rabbit-epp.js` service.

The `whitelisted_ips` tells the REST application to only accept certain hosts.




## Testing

        npm test

Note that a number of tests are currently set to *skip* automatically. These
require a running RabbitMQ instance and that you have set up the configuration
accordingly. They also assume that you have an online testing environment
(OTE) account with some registry or registrar.

## Running the web service

You can start the REST based interface as follows:

    node lib/server.js -r registry-test1

This will start a single epp client that is logged into "Registry1".

    foreverd start -o nodepp-stout.log -e nodepp-sterr.log lib/server.js \
        -r registry-test1 -r registry-test2 -r registry-test3

This runs it as  daemon in the background and tells it to open connections
to three different registries. The registries passed as arguments to `-r`
correspond to the keys in the `registries` section of the configuration file.

To stop the service:

    foreverd stop lib/server.js


You can test the script by posting JSON requests to the server instance. I
recommend using the program **Postman** which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice. I put an example of this down below.

## Running the RabbitMQ service

This sets up a RPC service that listens for connections on RabbitMQ.

    node lib/rabbit-epp.js -r registry-test1

To run it as a daemon:

    foreverd start -o nodepp-stout.log -e nodepp-sterr.log lib/rabbit-epp.js \
        -r registry-test1 -r registry-test2 -r registry-test3

You can stop the service like so:

    foreverd stop lib/rabbit-epp.js

*Note* that for all commands documented below, the datastructure that is sent
via RabbitMQ needs to be modified as follows:

     {
        "command": "<command name>",
        "data": <request data>
     }




## EPP Commands


### checkContact

```javascript
{"id": "P-12345xyz"}
```

or

```javascript
{"contact": "P-12345xyz"}
```


### infoContact

```javascript
{"id": "P-12345xyz"}
```

or


```javascript
{"contact": "P-12345xyz"}
```



### createContact


```javascript
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
```

Some registries set the `id` by default. In such cases it's common to use
`auto`. The value for `type` may also vary for different
registries. Some require `loc` and some require `int`. EPP allows for
up to 2 _postaInfo_ entries, however I've never seen a registry that accepts
more than 1. For that reason, you can just specify it as a single object:

```javascript
"postalInfo": {
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
}
```

It will be passed to the registry in the appropriate format. The same applies
to the _addr_ field (in _postalInfo_), which can also be specified as an Array
or single object.

```javascript
"addr": {
    "street": ["742 Evergreen Terrace", "Apt b"],
    "city": "Springfield",
    "sp": "OR",
    "pc": "97801",
    "cc": "US"
}
```

### updateContact


```javascript
{
    id: "p-12345",
    add: ['clientDeleteProhibited'],
    rem: ['clientTransferProhibited'],
    chg: {
        "postalInfo": [{
            "name": "John Doe",
            "org": "Example Ltd",
            "type": "loc",
            "addr": [{
                "street": ["742 Evergreen Terrace", "Apt b"],
                "city": "Eugene",
                "sp": "OR",
                "pc": "97801",
                "cc": "US"
            }]
        }],
        "voice": "+1.9405551234",
        "fax": "+1.9405551233",
        "email": "john.doe@null.com",
        "authInfo": {
            "pw": "xyz123"
        },
        "disclose": {
            "flag": 0,
            "disclosing": ["voice", "email"]
        }
    }
}
```


### checkDomain

The following are equivalent:

```javascript
{"domain": "something.com"}
```

or

```javascript
{"name": "something.com"}
```

It is possible to check more than one domain at a time.


```javascript
        {"domain": ["test-domain.com", "test-domain2.com", "test-domain3.com"]}
```


### infoDomain


```javascript
        {"domain": "something.com"}
```


In case you are wondering if you can send multiple domains like in
_checkDomain_, the answer is no. That's not possible in EPP. The result that
you will get back in one _infoDomain_ will be complicated enough.

### createDomain

```javascript
{
    "name": "iwmn-test-101-domain.com",
    "period": {
        "unit": "y",
        "value": 1
    },
    "ns":[
        "ns1.hexonet.net",
        "ns2.hexonet.net"
    ],
        "registrant": "my-id-1234",
    "contact": [
        { "admin": "my-id-1235" },
        { "tech": "my-id-1236" },
        {"billing": "my-id-1236"}
    ],
    "authInfo": {
        "pw": "Axri3k.XXjp"
    }
}
```

See comments below regarding alternative formats for _ns_, _period_, and
_authInfo_ fields.


### deleteDomain


```javascript
        {"domain": "something.com"}
```

### renewDomain


```javascript
{
    "domain": "something.com",
    "curExpDate": "2016-04-03",
    "period": {
        "unit": 'y',
        "value": 1
    }
}
```

*period* is optional and will default to 1 year.


### transferDomain

```javascript
{
    "name": "test-domain.com",
    "op": "request",
    "period": 1,
    "authInfo": {
        "roid": "P-12345", // optional
        "pw": "2fooBAR"
    }
}
```

Valid values for `op` are _approve_, _cancel_, _query_, _reject_, and
_request_. There uses are:

   * Requesting side
      1. _request_ to request a transfer.
      2. _cancel_ to cancel a transfer.
      3. _query_ to find out if a transfer is pending (although we should get
         info via polling)


   * Domain holder side
      1. _approve_ to approve a transfer request from another registrar.
      2. _reject_ to reject a transfer request from another registrar.

### updateDomain

```javascript
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
```

This is a very complicated example but at least shows what is possible in an
_updateDomain_. At least 1 of `add`, `rem`, or `chg` is required.
The `chg` field, if provided, must contain either a `registrant`
and/or an `authInfo`. `add` and `rem` elements, if provided, must
contain any one or more `ns`, `contact`, or `status` fields.


### createHost

```javascript
{
    "name": "ns1.host.com",
    "addr": ["23.84.43.123", {
        "ip": "22.4.22.5"
    },
    {
        "ip": "::F3:34::BA:",
        "type": "v6"
    }]
}
```

### updateHost

```javascript
{
    "name": "ns1.host.com",
    "chg": {
        "name": "ns2.host.com",
    },
    "add": {
        "addr": {
            "ip": "::F3:34::BA:",
            "type": "v6"
        },
        "status": ["clientUpdateProhibited"]
    },
    "rem": {
        "addr": ["23.84.43.123", {
            "ip": "22.4.22.5"
        }],
        "status": ["clientTransferProhibited", "sneezeAchoo"]
    }
}
```



## General stuff


Some of the required datastructures might seem a bit weird. EPP has a fairly
complex grammar that is _probably_ intended to make granular control of domain
related entities possible. There are no flat datastructures and some things
must be specified explicitly that would be assumed in systems that use
*key=value* like APIs. For example, to remove nameservers from a domain, it is
necessary to remove them explicitly. Simply updating domain with _the new
nameservers_ will not work. The same goes for contact objects.

### Host objects

In _createDomain_ and _updateDomain_ I've tried to account for 2 different
types of host objects. In the simplest version you can just pass an array of
strings:

```javascript
    ["ns1.host.com", "ns2.host.tld"]
```

In cases where IP addresses are required, the following variants can be used:

```javascript
    [{host: "ns1.host.com", addr: "62.47.23.1"}]
    [{host: "ns2.host.com", addr:[ "62.47.23.1", {ip: "53.23.1.3"}    ]}]
    [{host: "ns3.host.com", addr:[ {ip: "::F3:E2:23:::", type: "v6"}, {ip:"47.23.43.1", type: "v4"} ]}]
```

`type` is `v4` by default. You'll have to specify `v6` explicitly for IPv6
addresses.

It's up to you to know which cases glue records are required. This
implementation has no way to know that.

### authInfo

_createContact_, _createDomain_, _transferDomain_ and _updateDomain_ accept an
`authInfo` parameter.

Following are equivalent:

```javascript
    authInfo: "te2tP422t"
```

or

```javascript
    authInfo: {
        pw: "te2tP422t"
    }
```

In some cases you may need to supply a `roid` in addition to the
`authInfo`.  This is used to identify the registrant or contact object if
and only if the given authInfo is associated with a registrant or contact
object, and not the domain object itself.

```javascript
authInfo: {
        pw: "te2tP422t",
        roid: "P-1234"
}
```


### period


The `period` argument in _createDomain_, _renewDomain_ and  _transferDomain_ can be specified as follows:

1 year registration

```javascript
period: 1
```

24 month registration

```javascript
period: {
    unit: "m",
    value: 24
}
```

The default unit is _y_ for year and default period is 1.

### transactionId

A `transactionId` is optional. It can be added at the top level of the JSON data
structure. By default it will be set to `iwmn-<epoch timestamp>`.

### Extensions

You can optionally add an `extension` property to some commands. This
varies from registry to registry like everything else.  A good example is when
adding `DNSSEC` data to a *createDomain*:


```javascript
{
    "name": "iwmn-test-101-domain.com",
    "period": {
        "unit": "y",
        "value": 1
    },
    "ns":["ns1.hexonet.net","ns2.hexonet.net"],
        "registrant": "my-id-1234",
    "contact": [
        { "admin": "my-id-1235" },
        { "tech": "my-id-1236" },
        {"billing": "my-id-1236"}
    ],
    "authInfo": {
        "pw": "Axri3k.XXjp"
    },
    "extension": {
        "DNSSEC": {
            "maxSigLife": 604800,
            "dsData": {
                "keyTag": 12345,
                "alg": 3,
                "digestType": 1,
                "digest": "49FD46E6C4B45C55D4AC",
                "keyData": {
                    "flags": 257,
                    "protocol": 3,
                    "alg": 1,
                    "pubKey": "AQPJ////4Q=="
                }
            }
        }
    }
}
```


### DNSSEC

I've implemented ```DNSSEC``` EPP generation for create and update.

Following are some variations that you can send (I'm leaving out the standard
part of the EPP request):

#### createDomain

Create a domain with the `dsData` interface:

```javascript
"extension": {
    "DNSSEC": {
        "maxSigLife": 604800,
        "dsData": {
            "keyTag": 12345,
            "alg": 3,
            "digestType": 1,
            "digest": "49FD46E6C4B45C55D4AC"
        }
    }
}
```

with the `keyData` interface:

```javascript
"extension": {
    "DNSSEC": {
        "keyData":{
            "flags": 257,
            "protocol": 3,
            "alg": 1,
            "pubKey": "AQPJ////4Q=="
        }
    }
}
```

with the `keyData` in the `dsData` element:

```javascript
"extension": {
    "DNSSEC": {
        "maxSigLife": 604800,
        "dsData": {
            "keyTag": 12345,
            "alg": 3,
            "digestType": 1,
            "digest": "49FD46E6C4B45C55D4AC",
            "keyData":{
                "flags": 257,
                "protocol": 3,
                "alg": 1,
                "pubKey": "AQPJ////4Q=="
            }
        }
    }
}
```

#### updateDomain


Add a ```dsData``` key and remove a ```keyData``` key and change the
```maxSigLife``` of the key

```javascript
"extension": {
    "DNSSEC": {
        "add": {
            "dsData": {
                "keyTag": 12345,
                "alg": 3,
                "digestType": 1,
                "digest": "49FD46E6C4B45C55D4AC"
            }
        },
        "rem": {
            "keyData": {
                "flags": 257,
                "protocol": 3,
                "alg": 1,
                "pubKey": "AQPJ////4Q=="
            }
        },
        "chg": {
            "maxSigLife": 604800
        }
    }
}
```

Remove all existing key info and replace it with something new:

```javascript
"extension": {
    "DNSSEC": {
        "rem": {
            "all": true
        },
        "add": {
            "dsData": {
                "keyTag": 12345,
                "alg": 3,
                "digestType": 1,
                "digest": "49FD46E6C4B45C55D4AC"
            }
        }
    }
}
```


## Example usage:

Post the following to http://localhost:3000/command/hexonet/checkDomain

    prompt$ time curl -H "Content-Type: application/json" \
        -d '{"domain": "test-domain.com"}'  \
                http://localhost:3000/command/<registry>/checkDomain

_Note_ I just put ```time``` in there to show what the execution time is.
*YMMV*


You should get the following response (or something similar):

        "result":{
            "code":1000,"msg":"Command completed successfully"},
            "resData":{
                "domain:chkData": {
                    "xmlns:domain":"urn:ietf:params:xml:ns:domain-1.0",
                    "xsi:schemaLocation":"urn:ietf:params:xml:ns:domain-1.0 domain-1.0.xsd",
                "domain:cd":{
                    "domain:name":{
                        "avail":0,
                        "$t":"test-domain.com"
                        },
                    "domain:reason":"Domain exists"
                    }
                }
            },


I plan to get rid of some of the EPP cruft in the near future.
