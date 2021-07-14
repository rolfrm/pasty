echo $SERVY_ARGS
SERVY=../servy/servy
HOST=http://localhost:8889
WSHOST=ws://localhost:8889
$SERVY $HOST/index.html cat index2.html&
$SERVY $HOST/upload bash -c ./upload-file.sh&
$SERVY $WSHOST/upload-ws bash -c ./upload-file-ws.sh&
$SERVY $HOST/download bash -c ./download-file.sh&
$SERVY $HOST/delete bash -c ./delete-file.sh&
$SERVY $HOST/code.js cat code2.js&
$SERVY $HOST/style.css cat style.css.js
