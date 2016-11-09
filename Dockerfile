FROM node:latest
MAINTAINER Travis Holton <wtholton at gmail dot com>

WORKDIR /opt/project/node-epp
COPY . /opt/project/node-epp
RUN npm i

EXPOSE 3000

CMD ["npm", "test"]
