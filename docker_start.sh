#!/bin/sh

if [ "$INTERACTIVE" = 1 ]; then
    /usr/bin/supervisord -c /etc/supervisor/supervisord.conf && /bin/bash
else
    /usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf
fi

#: ${EPP_ENVIRONMENT:=devel}
#echo "Link ${EPP_ENVIRONMENT} config"

#CONFIG="config/epp-config-${EPP_ENVIRONMENT}.json"

#if [ -e $CONFIG ]; then
    #ln -sf $CONFIG  config/epp-config.json
#fi


#npm start


