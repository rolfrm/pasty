
async function doCopyStream(input, controller){
    var reader = input.getReader();
    while(true){
		  var {done, value} = await reader.read()
		  if(done)
				break;
		  controller.enqueue(value)
    }
    controller.close()
}

function copyStream (stream) {
    return new ReadableStream({
		  start (controller) {
				doCopyStream(stream, controller);	    
		  },
		  cancel () {
				console.log('user aborted')
		  }
    })
}

async function decryptStream(str, pass){
	 let rd = str.getReader()
	 let {value, done} = await rd.read()
	 let iv = CArray.FromArray(value.subarray(0, 16))
	 console.log("IV", done, iv.ToArray())
	 let padded = pass.padEnd(32, " ")
	 let key = CArray.FromString(padded)
	 let decryptor = Cipher.Decryptor(key, iv)
	 var rest = value.subarray(16)
	 let rd2 = new ReadableStream(
		  {
				async pull(controller){
					 console.log("pull...")
					 if(rest){
						  let c1 = CArray.FromArray(rest)
						  let buffer = CArray.FromSize(rest.length)

						  let l = decryptor.Update(c1, buffer)
						  if(l > 0)
								controller.enqueue(buffer.GetSlice(0, l).ToArray())
						  c1.Dispose()
						  buffer.Dispose()
						  rest = null
					 }
					 console.log("pulling next:")
					 let r = await rd.read()
					 const {value, done} = r;

					 if (done){
						  
						  let buffer = CArray.FromSize(16)
						  let l = decryptor.Finish(buffer)
						  let chunk = buffer.GetSlice(0, l).ToArray();
						  console.log("pull done", chunk)
						  if(l > 0)
								controller.enqueue(chunk)
						  buffer.Dispose()
						  controller.close()
						  decryptor.Dispose()
						  return;
					 }
					 let c1 = CArray.FromArray(value)
					 let buffer = CArray.FromSize(c1.len)

					 let l = decryptor.Update(c1, buffer)
					 let chunk = buffer.GetSlice(0, l).ToArray()
					 console.log("pull part", chunk)
					 controller.enqueue(chunk)
					 c1.Dispose()
					 buffer.Dispose()
				}
		  }
	 );
	 return rd2
}

async function getDecryptedStream(response, pass, headers){
	 let r = await response
	 let stream = await decryptStream(r.body, pass)
	 return new Response(stream, {headers: headers});
}

self.addEventListener( "fetch", event => {

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
});

