
FROM ubuntu:trusty
MAINTAINER Travis Holton <travis@ideegeo.com>

WORKDIR /root

RUN apt-get update
RUN apt-get install -y software-properties-common 
RUN apt-get install -y python 
RUN apt-get install -y expat
RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install -y nodejs 
RUN apt-get install -y node-gyp 
RUN apt-get install -y libnode-node-expat 
RUN apt-get install -y node-node-expat

RUN apt-get clean
ADD package.json /root/package.json
RUN npm install 
RUN export PATH="$PATH:/root/node_modules/.bin"
ADD lib /root/lib
ADD test /root/test
ADD config /root/config
RUN npm test
EXPOSE 3000

