
FROM ubuntu:trusty
MAINTAINER Travis Holton <travis@ideegeo.com>



WORKDIR /usr/local/d8o/nodepp
RUN echo 'deb http://archive.ubuntu.com/ubuntu/ trusty main universe' > /etc/apt/sources.list.d/nodepp.list

RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install nodejs
RUN mkdir -p /usr/local/d8o/etc/ssl/certs
# Because I'm not keen on having our certs hanging about for all to see
RUN gpg -d A000A000000000000052.pem.asc > /usr/local/d8o/etc/ssl/certs/A000A000000000000052.pem
RUN gpg -d iwantmyname.com.key.org.asc > /usr/local/d8o/etc/ssl/certs/iwantmyname.com.key


# clean up
RUN apt-get clean
