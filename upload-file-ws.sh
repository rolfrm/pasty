#/bin/bash
UUID=`uuidgen`
echoerr() { echo "$@" 1>&2; }
len=$(./readint)
echoerr contentlen: $len
head -c $len | ./upload.sh ddd/$UUID $len
echo ddd/$UUID
