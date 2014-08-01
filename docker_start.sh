#!/bin/sh

echo "Creating cert file"
gpg -d A000A000000000000052.pem.asc > A000A000000000000052.pem
gpg -d iwantmyname.com.key.org.asc > iwantmyname.com.key
