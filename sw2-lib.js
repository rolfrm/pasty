

async function getDecryptedStream(response, pass, headers){
	 let r = await response
	 let stream = await decryptStream(r.body, pass)
	 return new Response(stream, {headers: headers});
}

self.onfetch = event => {

    if(event.request.url.indexOf("/download2/") < 0)
		  return
    if(event.request.url.indexOf("/download2/file") >= 0){
		  var partsInit = new URL(event.request.url).search.substring(1).split("&");
		  var parts = {}
		  for(const part of partsInit){
				var subParts = part.split("=");
				parts[subParts[0]] = subParts[1];
		  }
    	  const p = "/download?file=" + parts['file'] ;
		  var response = fetch(p);

		  const responseHeaders = new Headers({
				'Content-Type': 'application/octet-stream; charset=utf-8',
				'Content-Security-Policy': "default-src 'none'",
				'X-Content-Security-Policy': "default-src 'none'",
				'X-WebKit-CSP': "default-src 'none'",
				'X-XSS-Protection': '1; mode=block'
		  })
		  if( parts['size']) {
				responseHeaders.set('Content-Length', parts['size'])
		  }
		  if(parts['pass']){
				console.log("got passworded file");
				var body = getDecryptedStream(response, parts['pass'], responseHeaders)
				return event.respondWith(body);
		  }
		  console.log("plaintext file");
		  var body = response.then(x =>  new Response(copyStream(x.body), {headers: responseHeaders}))
		  return event.respondWith(body);
    }
    var pong = new Response('pong2')
    return event.respondWith(pong);
}

