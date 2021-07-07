#/bin/bash
objectName=$file
bucket=crypto-storage
resource="/${bucket}/${objectName}"
contentType="application/octet-stream"
dateValue=`TZ=utc date -R`
stringToSign="DELETE\n\n${contentType}\n${dateValue}\n${resource}"
signature=`echo -en ${stringToSign} | openssl sha1 -hmac ${s3Secret} -binary | base64`
echo -en $stringToSign>teststringtosign
#echo $signature
curl -X DELETE -s\
  -H "Host: ${bucket}.eu-central-1.linodeobjects.com" \
  -H "Date: ${dateValue}" \
  -H "Content-Type: ${contentType}" \
  -H "Authorization: AWS ${s3Key}:${signature}" \
  https://${bucket}.eu-central-1.linodeobjects.com/${objectName} 
echo done
