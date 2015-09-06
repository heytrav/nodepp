FROM node:0.12
MAINTAINER Travis Holton <travis@ideegeo.com>

# Add project files
WORKDIR /opt/node-epp
ADD . /opt/node-epp

RUN apt-get update && apt-get install -y git
RUN npm install

RUN apt-get purge -y git && apt-get clean

ENV NODE_PATH /opt/node-epp/node_modules

RUN npm test
