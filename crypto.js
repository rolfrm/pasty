
function nullIterator(size){
	 const blockSize = 64
	 return {
		  next: function(){
				if(size > blockSize){
					 size -= blockSize
					 return {value: new Uint8Array(blockSize), done: false};
				}else if(size > 0){
					 let r = new Uint8Array(size);
					 size = 0
					 return {value: r, done: false}
				}else
					 return {value: undefined, done: true};
		  }
	 }
}
function nullStream(size){
	 let it = nullIterator(size)
	 return itStream(it)
}

function itStream(it){
	 return new ReadableStream(
		  {
				pull(controller){
					 const {value, done} = it.next();
					 if (done){
						  controller.close();
						  return;
					 }
					 controller.enqueue(value);
				}
		  }
	 );
}


function rampIterator(size){
	 const blockSize = 64
	 var it = 0;
	 return {
		  next: function(){
				if(size <= 0)
					 return {value: undefined, done: true}
				var chunk = blockSize
				if(chunk > size)
					 chunk = size
				size -= chunk
				var arr = new Uint8Array(chunk)
				for(var i = 0; i < chunk; i++){
					 arr[i] = it
					 it += 1
					 if(it > 255)
						  it = 0
				}
				return {value: arr, done: false}
		  }
	 }
}

function rampStream(size){
	 return itStream(rampIterator(size))

}

class EncryptStreamTransform extends TransformStream{
	 static tformContent = {
		  start (){},
		  transform(chunk, controller){

				let buffer = CArray.FromSize(chunk.length)
				let inarr = CArray.FromArray(chunk);
				let l = this.enc.Update(inarr, buffer)
				controller.enqueue(buffer.GetSlice(0, l).ToArray());
				buffer.Dispose()
				inarr.Dispose()
		  },
		  flush(controller){

				
				let buffer = CArray.FromSize(16)
				let l = this.enc.Finish(buffer)
				let rest = buffer.GetSlice(0, l).ToArray()
				controller.enqueue(rest);
				
				buffer.Dispose()
		  }
	 }

	 constructor(enc){
		  super({...EncryptStreamTransform.tformContent, enc: enc})
	 }
	 
}

async function streamToArray(stream){
	 let rd = stream.getReader()
	 let arrays = []
	 let it = 0
	 let total = 0
	 while(true){
		  let {value, done} = await rd.read()
		  if (done) break;
		  arrays[it] = value
		  it = it + 1
		  total += value.length
	 }
	 let r = new Uint8Array(total)
	 let offset = 0
	 arrays.forEach(item => {
		  r.set(item, offset)
		  offset += item.length
	 });
	 
	 
	 return r;
	 
}

function testEncryptionStream(){
	 
	 let key = CArray.FromString("01234567890123456789012345678901");
	 let iv = CArray.FromString("0123456789012345");
	 let enc = Cipher.Encryptor(key, iv)
	 let dec = Cipher.Decryptor(key, iv)
	 let str = rampStream(500);
	 let tra = new EncryptStreamTransform(enc)
	 let tra2 = new EncryptStreamTransform(dec)

	 streamToArray(str.pipeThrough(tra).pipeThrough(tra2)).then(x => console.log(x))
}

function testEncryption(){

	 key = CArray.FromString("01234567890123456789012345678901");
	 iv = CArray.FromString("0123456789012345");
	 enc = Cipher.Encryptor(key, iv)
	 dec = Cipher.Decryptor(key, iv)
	 b1 = CArray.FromSize(531);
	 b2 = CArray.FromSize(531);
	 b3 = CArray.FromSize(32);
	 l = enc.Update(b1,b2)
	 l2 = enc.Finish(b3)
	 return [l, b2.GetView(), b3.GetView()]
}
