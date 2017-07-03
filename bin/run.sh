#!/bin/bash

# This variable is the absolute path to the
# bin directory in the white root directory.
bindir="/var/www/white/bin"

while true; do
    echo "Starting white-server.php";
    php ${bindir}/white-server.php
    echo "Chat server died: `date`"
    sleep 2
done
