#/bin/bash
objectName=$1
contentLength=$2
bucket=crypto-storage
resource="/${bucket}/${objectName}"
contentType="application/octet-stream"
dateValue=`TZ=utc date -R`
stringToSign="PUT\n\n${contentType}\n${dateValue}\n${resource}"
signature=`echo -en ${stringToSign} | openssl sha1 -hmac ${s3Secret} -binary | base64`
echo -en $stringToSign>teststringtosign
curl -X PUT --data-binary @- --verbose  \
  -H "Host: ${bucket}.eu-central-1.linodeobjects.com" \
  -H "Date: ${dateValue}" \
  -H "Content-Type: ${contentType}" \
  -H "Content-Length: ${contentLength}"\
  -H "Authorization: AWS ${s3Key}:${signature}" \
  https://${bucket}.eu-central-1.linodeobjects.com/${objectName}
