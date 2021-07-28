
echo $SERVY_ARGS
SERVY=../servy/servy
HOST=http://localhost:8889
WSHOST=ws://localhost:8889
$SERVY $HOST/index.html cat index2.html&
$SERVY $HOST/upload bash -c ./upload-file.sh&
$SERVY $WSHOST/upload-ws bash -c ./upload-file-ws.sh&
$SERVY $WSHOST/download-ws bash -c ./download-file-ws.sh&
$SERVY $HOST/download bash -c ./download-file.sh&
$SERVY $HOST/delete bash -c ./delete-file.sh&
#$SERVY $HOST/download2/test echo "ERRROR"&
SERVY_MIME=text/javascript $SERVY $HOST/code.js cat code2.js&
SERVY_MIME=text/javascript $SERVY $HOST/sw2.js cat sw2.js&
SERVY_MIME=text/css $SERVY $HOST/style.css cat style.css
