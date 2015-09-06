#!/bin/sh

if [ "$INTERACTIVE" = 1 ]; then
    /usr/bin/supervisord -c /etc/supervisor/supervisord.conf && /bin/bash
else
    /usr/bin/supervisord --nodaemon -c /etc/supervisor/supervisord.conf
fi
