FROM node:6.10.3-alpine
MAINTAINER Travis Holton <heytrav at protonmail dot com>

RUN mkdir -p /var/lib/node-epp
WORKDIR /var/lib/node-epp
COPY package.json /var/lib/node-epp
RUN apk --no-cache add --virtual native-deps \
  g++ gcc libgcc libstdc++ linux-headers make python && \
  npm install --quiet node-gyp -g &&\
  npm install --quiet && \
  apk del native-deps
ENV NODE_PATH /var/lib/node-epp/node_modules:$NODE_PATH

WORKDIR /opt/project/node-epp
COPY . /opt/project/node-epp

EXPOSE 3000

CMD ["npm", "test"]
