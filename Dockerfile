FROM node:latest
MAINTAINER Travis Holton <heytrav at protonmail dot com>

WORKDIR /var/lib/node-epp
COPY package.json /var/lib/node-epp
RUN npm install 
ENV NODE_PATH /var/lib/node-epp/node_modules:$NODE_PATH

WORKDIR /opt/project/node-epp
COPY . /opt/project/node-epp

EXPOSE 3000

CMD ["npm", "test"]
