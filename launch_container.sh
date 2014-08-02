#!/bin/bash

set -e

while getopts ":r:e:p:h"; do
  case "${opt}" in
    r)
      REGISTRY+=("$OPTARG")
      ;;
    e)
      ENVIRONMENT=${OPTARG}
      ;;
    p)
      PORT=${OPTARG}
      ;;
  esac
done
shift $(($OPTIND-1))

# set some defaults
${ENVIRONMENT:=devel}
${PORT:=3000}


docker run -v /usr/local/d8o/nodepp:/usr/local/d8o/nodepp -p ${PORT}:${PORT} -e ENVIRONMENT=$ENVIRONMENT -v /usr/local/d8o/etc/ssl/certs:/usr/local/d8o/etc/ssl/certs -t -i -d docker.domarino.com/nodepp ./docker_start.sh
