#/bin/bash
objectName=$file
bucket=crypto-storage
resource="/${bucket}/${objectName}"
contentType="application/octet-stream"
dateValue=`TZ=utc date -R`
stringToSign="GET\n\n${contentType}\n${dateValue}\n${resource}"

# Must be defined:
#s3Key=XXXXX
#s3Secret=XXXXX
signature=`echo -en ${stringToSign} | openssl sha1 -hmac ${s3Secret} -binary | base64`
echo -en $stringToSign>teststringtosign
curl -X GET -s \
  -H "Host: ${bucket}.eu-central-1.linodeobjects.com" \
  -H "Date: ${dateValue}" \
  -H "Content-Type: ${contentType}" \
  -H "Authorization: AWS ${s3Key}:${signature}" \
  https://${bucket}.eu-central-1.linodeobjects.com/${objectName}
