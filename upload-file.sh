#/bin/bash
UUID=`uuidgen`

if ! [[ $request_length =~ ^-?[0-9]+$ ]] ; then
    echo "Is integer!"; exit 1
fi


./upload.sh ddd/$UUID $request_length
echo ddd/$UUID
