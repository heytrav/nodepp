#nodepp

An EPP implementation in node.js

[![Docker Repository on Quay.io](https://quay.io/repository/heytrav/nodepp/status "Docker Repository on Quay.io")](https://quay.io/repository/heytrav/nodepp)

[![CircleCI](https://circleci.com/gh/heytrav/nodepp/tree/master.svg?style=svg)](https://circleci.com/gh/heytrav/nodepp/tree/master)

##Description

This is a service for communicating with registries over EPP. It
takes datastructures in JSON, converts them to XML, sends them to the
registry, and then does the whole thing in reverse with the response.

There are several tools included with this package:

1. `lib/node-epp-server.js` is designed to function as a web interface where you can
   POST and receive json requests to/from multiple registries.
2. `lib/node-epp-restful.js` similar to above, but only connects to one
   registry and has a couple specific GET endpoints for `check-` and
   `infoDomain`.
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
    "app-config": {
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
`registry-test1`, `registry-test2`, etc. with something more descriptive of the registry.

When you've got the config setup the way you like it, symlink this to
`config/epp-config.json` to run the application.

    ln -s <path to app>/config/epp-config-devel.json <path to app>/config/epp-config.json


You can add as many registries as you like. You may even need to add the same
registry multiple times with different logins, etc. This is practical for
testing if you need to simulate transferring domains between two separate
registrars.


The `whitelisted_ips` tells the  application to only accept certain hosts.




## Testing

        npm test

Note that a number of tests are currently set to *skip* automatically. These
require a running RabbitMQ instance and that you have set up the configuration
accordingly. They also assume that you have an online testing environment
(OTE) account with some registry or registrar.

### General CLI options


* `-r`, `--registries`
  Specify registries. For `node-epp-server.js`, this can be used multiple times to open connections to several registries at once.
* `-f`, `--config-file`
  The `-f` option specifies a file containing configuration for the registries you wish to connect to. See *Configuration* section.
* `-a`, `--app-config`
  Pass registry configuration as a JSON string. 
* `-j`, `--json` 
  Output logs in json
* `--loglevel` 

## Running the web service

There are two web service scripts.
* `node-epp-server.js`
* `node-epp-restful.js`


### `node-epp-server.js`

This webservice app is based on express.js and listens for POST requests on port 3000. 
You can start it as follows:

    node ./lib/node-epp-server.js -f my-config.json -r registrar1 -r registrar2 [-j] [--loglevel debug] 

This will startup with a child process connected to `registrar` and
`registrar2`. Note that the `-r` arguments should correspond to a registrar in
your `config/epp-config.json` file.

Alternatively you can start it as a daemon:

    foreverd start -o nodepp-stout.log -e nodepp-sterr.log lib/node-epp-server.js \
        -f my-config.json

The general URL scheme is as follows:

    http://<host>:3000/command/<registry>/<command>
    
So to run a *checkDomain* for *registry1* on a local instance of the server, POST your request to:


    http://localhost:3000/command/registry1/checkDomain



To stop the service:

    foreverd stop lib/node-epp-server.js


You can test the script by posting JSON requests to the server instance. I
recommend using the program *Postman* which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice. I put an [example](https://github.com/heytrav/nodepp#example-usage) of this down below. 

### `node-epp-restful.js`


This is a simpler alternative to `node-epp-server`.  Unlike `node-epp-server.js` which forks off a child worker for each registry
passed in the command line, `node-epp-restful.js` only starts one process and
only connects to one registry. 

Originally `node-epp-server.js` was written with the understanding that one would
start the app with connections for multiple registries (or the same registry
multiple times). However, I found this to be a bit impractical for running as a
microservice. Not to mention the config file was becoming fairly convoluted.
It seemed more sensbile for a *microservice* to just "run more instances". I also found
it a bit difficult to keep track of child processes that would die or hang
because of broken connections. 

`node-epp-restful.js` will just quit if the connection goes stale. This makes it easier to catch and restart if you are running the application in a docker container or with `forever`.

It can be started in a similar fashion to `node-epp-server.js`.

    node lib/node-epp-restful.js -r <some registry> -j --loglevel debug



`node-epp-restful.js` also has a couple specific GET endpoints for handling
simple `checkDomain` and `infoDomain` commands

    curl http://<local url>:<port>/checkDomain/whatever.tld

Note that you do not need to specify the `registry` as part of the URL. It is
assumed that you are running each microservice with a specific location (IP
address or local URL) and that it will always be the same for a particular
instance.


## Running the RabbitMQ service

This is a RPC service that listens for connections on RabbitMQ. Have a look at the `rabbitmq` section of the configuration file if you would like to run this. To run the application:

    node lib/rabbit-epp.js -r registry-test1

Or as a daemon:

    foreverd start -o nodepp-stout.log -e nodepp-sterr.log lib/rabbit-epp.js \
        -r registry-test1 -r registry-test2 -r registry-test3

To stop it:

    foreverd stop lib/rabbit-epp.js

*Note* that for all commands documented below, the datastructure that is sent
via RabbitMQ needs to be modified as follows:

     {
        "command": "<command name>",
        "data": <request data>
     }
     
I wrote some scripts for interacting with the RabbitMQ service in my [epp-reg](https://github.com/heytrav/epp-reg) project. Feel free to use those as you like.




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
    "name": "myreg-test-101-domain.com",
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
`key=value` APIs. For example, to remove nameservers from a domain, it is
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
structure. By default it will be set to `myreg-<epoch timestamp>`.

### Extensions

You can optionally add an `extension` property to some commands. This
varies from registry to registry like everything else.  A good example is when
adding `DNSSEC` data to a *createDomain*:


```javascript
{
    "name": "myreg-test-101-domain.com",
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


## Example usage

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
