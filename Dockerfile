FROM node:latest
MAINTAINER Travis Holton <wtholton at gmail dot com>

WORKDIR /opt/project
ADD package.json /opt/project

RUN npm install

WORKDIR /opt/project/node-epp
ADD . /opt/project/node-epp

RUN npm test
