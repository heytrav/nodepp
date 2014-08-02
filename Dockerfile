
FROM ubuntu:trusty
MAINTAINER Travis Holton <travis@ideegeo.com>



WORKDIR /usr/local/d8o/nodepp
RUN echo 'deb http://archive.ubuntu.com/ubuntu/ trusty main universe' > /etc/apt/sources.list.d/nodepp.list

RUN apt-get update
RUN apt-get install -y software-properties-common python expat
RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install -y nodejs node-gyp libnode-node-expat node-node-expat

RUN apt-get clean
RUN mkdir -p /usr/local/d8o/etc/ssl/certs
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /usr/local/d8o/nodepp/node_modules
ADD iwantmyname.com.key /usr/local/d8o/etc/ssl/certs/iwantmyname.com.key
ADD A000A000000000000052.pem /usr/local/d8o/etc/ssl/certs/A000A000000000000052.pem

CMD ["./docker_start.sh"]
