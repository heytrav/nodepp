FROM node:0.12
MAINTAINER Travis Holton <travis@ideegeo.com>

RUN apt-get update && apt-get install -y git supervisor

# Allow Docker to cache node_modules between builds
ADD package.json /tmp/package.json
ADD supervisor /etc/supervisor/

RUN cd /tmp && npm install
RUN apt-get purge -y git && apt-get clean

RUN mkdir -p /opt/node-epp && cp -a /tmp/node_modules /opt/node-epp/
ENV NODE_PATH /opt/node-epp/node_modules

# Add project files
WORKDIR /opt/node-epp
ADD . /opt/node-epp

RUN npm test
CMD ["./launch.sh"]
