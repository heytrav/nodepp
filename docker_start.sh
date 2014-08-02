#!/bin/sh

echo "Creating cert file"
gpg -d A000A000000000000052.pem.asc > /usr/local/d8o/etc/ssl/certs/A000A000000000000052.pem
gpg -d iwantmyname.com.key.org.asc > /usr/local/d8o/etc/ssl/certs/iwantmyname.com.key
npm start &
