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
: ${REGISTRY:=registry-test3}
: ${ACTION:=run}

case "${ACTION}" in
    shell )
        echo "docker run -t -i  docker.domarino.com/nodepp /bin/bash"
        ;;
    run )
        echo "docker run -t -i -d  -p ${PORT}:${PORT} -e EPP_ENVIRONMENT=${ENVIRONMENT} -e EPP_REGISTRIES=${REGISTRY}  docker.domarino.com/nodepp ./docker_start.sh"
        ;;
esac


