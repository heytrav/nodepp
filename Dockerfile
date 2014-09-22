
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
ADD test /root/test
ADD lib /root/lib
RUN npm test

CMD ["./docker_start.sh"]
