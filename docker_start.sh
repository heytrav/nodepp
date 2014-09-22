#!/bin/sh

: ${EPP_ENVIRONMENT:=devel}
echo "Link ${EPP_ENVIRONMENT} config"

CONFIG="config/epp-config-${EPP_ENVIRONMENT}.json"

if [ -e $CONFIG ]; then
    ln -sf $CONFIG  config/epp-config.json
fi


npm start
