
FROM ubuntu:trusty
MAINTAINER Travis Holton <travis@ideegeo.com>



WORKDIR /usr/local/d8o/nodepp
RUN echo 'deb http://archive.ubuntu.com/ubuntu/ trusty main universe' > /etc/apt/sources.list.d/nodepp.list

RUN apt-get update
RUN apt-get install -y software-properties-common
RUN add-apt-repository ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get install -y nodejs

RUN apt-get clean

CMD ["./docker_start.sh"]
