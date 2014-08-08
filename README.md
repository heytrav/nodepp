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
domain related entities possible. There are no flat datastructures and some
things must be specified explicitly that would be assumed in systems like
the Hexonet API. For example, to remove nameservers from a domain, it is
necessary to remove them explicitly. Simply updating domain with _the new
nameservers_ will not work. The same goes for contact objects.

##Install


1. Clone the repository and ```cd``` into it.
2. Run ```npm install```. This should install all the dependencies.
3. Run tests with ```npm test```.
4. If you plan to run anything with NZRS, you'll need the key and signed
   certificate that we got back from them. Since I wasn't really sure about
   storing signed certificates and key files in the repository where
   someone (who isn't us) may eventually be able to find them, I encrypted
   them using gpg -a -c. This is just a temporary solution and I hope that we
   will come up with something a little more scalable. At any rate, you can
   decrypt them as follows:


        gpg -d A000A000000000000052.pem.asc > A000A000000000000052.pem
        gpg -d iwantmyname.com.key.org.asc > iwantmyname.com.key

5.  ```source nodepp.rc``` to include ```./node_modules/.bin``` in the
    ```$PATH```. This is only really necessary if you plan on running it as a
    daemon.

## Configure

Set up config. The configuration contains some essential data
organised by registry account. Note that we can have multiple registry
accounts at any given registry. Generally there will be only one
account for production, however there could be any number of *test*
accounts. Using them is equivalent to logging in to a registry as a
completely different registrar. This is primarily useful for simulating
incoming/outgoing contact/domain/host transfers. To setup up the config:

    ln -s lib/epp-config-devel.json lib/epp-config.json

This sets up the development accounts. To setup the production account
(which you should only ever do during deployment to a production platform,
shame on you), replace ```devel``` with ```production```.


##Running the service

You can start the process trivially using:

    node lib/server.js -r hexonet-test1

This will start a single epp client that is logged into Hexonet's test API.


On ```aldo.domarino.com``` I run it as follows:

    foreverd start -o nodepp-stout.log -e nodepp-sterr.log lib/server.js \
        -r hexonet-test1 -r nzrs-test1 -r nzrs-test2

Run as a daemon in the background.
This tells it to open connections to the Hexonet test api using an OTE login,
as well as the two OTE accounts provided to us by NZRS for testing.  If you
want to try this locally in your VM, leave off the two nzrs registries. NZRS
only allows us to interact with them from whitelisted servers so either we
need to have a tunnel set up, or we can only use EPP from one of our
production servers.

At this point the service should be running on some host (depending where you
started it) port 3000 and have
logged into Hexonet's test API. You can now make EPP requests by posting JSON
datastructures to ```http://<host>:3000/command/hexonet/<command>```.  Note
that this is to an OTE account (```travis1```) and may not reflect live data.

I recommend using the program **Postman** which can be installed in
Chrome/Firefox as an extension. However, you can also use curl or the
scripting language of your choice. I put an example of this down below.

## Not running the service

Kill the daemon process with:

    foreverd stop lib/server.js

When running locally, ```Ctrl-C``` will do.

Sending ```kill -INT``` to the ```pid``` of the ```lib/server.js``` process
triggers the client to send a ```logout``` command to the registries
and then shutdown. You can use this to kill local processes instead of
```Ctrl-C```.  With the daemon, this has the net effect of causing it to
```logout``` and then ```login``` again since ```foreverd```  will
automatically restart the process. This might be handy if some registries have
connection time limits.


Since I haven't gotten around to generating a pid file, the following command
is useful.


    kill -INT `ps waux | grep server.js | grep -v grep | awk '{print $2}'`


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

### checkDomain


```{"domain": "something.com"}```

It is possible to check more than one domain at a time.

```{"domain": ["test-domain.com", "test-domain2.com", "test-domain3.com"]}```

### infoDomain

```{"domain": "something.com"}```

In case you are wondering if you can send multiple domains like in
_checkDomain_, the answer is no. That's not possible in EPP. The result that
you will get back in one _infoDomain_ will be complicated enough.

### createDomain

        {
            "name": "iwmn-test-101-domain.com",
            "period": {
                "unit": "y",
                "value": 1
            },
            "ns":["ns1.hexonet.net","ns2.hexonet.net"],
                "registrant": "my-id-1234",
            "contact": [{ "admin": "my-id-1235" }, { "tech": "my-id-1236" }, {"billing": "my-id-1236"} ],
            "authInfo": {
                "pw": "Axri3k.XXjp"
            }
        }

### transferDomain

            {
                "name": "test-domain.com",
                "op": "request",
                "period": 1,
                "authInfo": {
                    "roid": "P-12345", // optional
                    "pw": "2fooBAR"
                }
            }

Valid values for ```op``` are _approve_, _cancel_, _query_, _reject_, and
_request_.

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

This is a very complicated example but at least shows what is possible in an _updateDomain_. At least 1 of ```add```, ```rem```, or ```chg``` is required. The ```chg``` field, if provided, must contain either a ```registrant``` and/or an ```authInfo```. ```add``` and ```rem``` elements, if provided, must contain any one or more ```ns```, ```contact```, or ```status``` fields.



## General stuff

### Host objects

In _createDomain_ and _updateDomain_ I've tried to account for 2 different
types of host objects. In the simplest version you can just pass an array of
strings:

    ["ns1.host.com", "ns2.host.co.nz"]

In cases where IP addresses are required, the following variants can be used:

    [{host: "ns1.host.com", addr: "62.47.23.1"}]
    [{host: "ns2.host.com", addr:[ "62.47.23.1", {ip: "53.23.1.3"}    ]}]
    [{host: "ns3.host.com", addr:[ {ip: "::F3:E2:23:::", type: "v6"}, {ip:"47.23.43.1", type: "v4"} ]}]

```type``` is ```v4``` by default. You'll have to specify ```v6``` explicitly for IPv6
addresses.

It's up to you to know which cases glue records are required. This
implementation has no way to know that.

### authInfo

_createContact_, _createDomain_, _transferDomain_ and _updateDomain_ accept an
```authInfo``` parameter.

Following are equivalent:

    authInfo: "te2tP422t"

or

    authInfo: {
        pw: "te2tP422t"
    }

In some cases you may need to supply a ```roid``` in addition to the
```authInfo```.  This is used to identify the registrant or contact object if
and only if the given authInfo is associated with a registrant or contact
object, and not the domain object itself.

    authInfo: {
            pw: "te2tP422t",
            roid: "P-1234"
    }


### period


The ```period``` argument in _createDomain_ and  _transferDomain_ can be specified as follows:

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

### transactionId

A ```transactionId``` is optional. It can be added at the top level of the JSON data
structure. By default it will be set to ```iwmn-<epoch timestamp>```.

## Example usage:

Post the following to http://localhost:3000/command/hexonet/checkDomain

    prompt$ time curl -H "Content-Type: application/json" \
        -d '{"domain": "test-domain.com"}'  \
                http://localhost:3000/command/hexonet/checkDomain

_Note_ I just put ```time``` in there to show what the execution time is.
*YMMV*


You should get the following response (or something similar):

    "response":{
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
        "trID":{
            "clTRID":"test-check-1234",
            "svTRID":"RO-5734-1406529047908280"
            }
        }

I plan to get rid of some of the EPP cruft in the near future.
