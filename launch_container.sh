#!/bin/bash

set -e

while getopts ":r:se:p:h" opt; do
  case "${opt}" in
    s)
        ACTION="shell"
        ;;
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
echo $REGISTRY
: ${ENVIRONMENT:=devel}
: ${PORT:=3000}
: ${REGISTRY:=hexonet-test1}
: ${ACTION:=run}

case "${ACTION}" in
    shell )
        echo "docker run -t -i -v /usr/local/d8o/nodepp:/usr/local/d8o/nodepp  -v /usr/local/d8o/etc/ssl/certs:/usr/local/d8o/etc/ssl/certs docker.domarino.com/nodepp /bin/bash"
        ;;
    run )
        echo "docker run -t -i -d -v /usr/local/d8o/nodepp:/usr/local/d8o/nodepp -p ${PORT}:${PORT} -e EPP_ENVIRONMENT=${ENVIRONMENT} -e EPP_REGISTRIES=${REGISTRY} -v /usr/local/d8o/etc/ssl/certs:/usr/local/d8o/etc/ssl/certs docker.domarino.com/nodepp ./docker_start.sh"
        ;;
esac


