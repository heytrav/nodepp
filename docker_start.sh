#!/bin/sh

echo "Link ${EPP_ENVIRONMENT} config"

CONFIG="lib/epp-config-${EPP_ENVIRONMENT}.json"

if [ -e $CONFIG ]; then
    ln -sf $CONFIG  lib/epp-config.json
fi


npm start
