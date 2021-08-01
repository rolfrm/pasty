class CArray{
	 constructor(ptr, len, isSlice){
		  this.ptr = ptr
		  this.len = len
		  this.isSlice = isSlice
	 }
	 
	 GetView() {
		  return new Uint8Array(wasmMemory.buffer, this.ptr, this.len)
	 }
	 
	 ToArray() {
		  let a = new Uint8Array(this.len)
		  a.set(this.GetView(), 0)
		  return a
	 }

	 GetSlice(offset, len) {
		  if(offset < 0 || offset + len > this.len)
				throw "slice is out of bounds";
		  return new CArray(this.ptr + offset, len, true)
	 }

	 Pointer() {
		  return this.ptr;
	 }

	 Dispose(){
		  if(this.isSlice)
				throw "cannot dispose an array slice"
		  if(this.ptr){
				CArray.totalSize -= this.len
				//console.log("CArray.Dispose", this.len, CArray.totalSize)
				Module._free(this.ptr)
				this.ptr = undefined
				this.len = undefined
		  }else{
				throw "Array already freed"
		  }
	 }

	 Clear(){
		  var fill = new Uint8Array(this.len)
		  writeArrayToMemory(fill, this.ptr)
	 }
	 
	 static totalSize = 0

	 static FromSize(size){
		  CArray.totalSize += size;
		  //console.log("CArray.FromSize", size , CArray.totalSize)
		  //var fill = new Uint8Array(size)
		  var ptr = Module._malloc(size)
		  //
		  return new CArray(ptr, size)
	 }
	 
	 static FromArray(array) {
		  var strptr = allocate(array, ALLOC_NORMAL);
		  CArray.totalSize += array.length
		  //console.log("CArray.FromArray", array.length, CArray.totalSize)
		  return new CArray(strptr, array.length);
	 }
	 static FromString(str) {
		  var arrayValues = intArrayFromString(str)
		  return CArray.FromArray(arrayValues)
	 }
}

class Cipher {
	 constructor(key, iv, enc){
		  if (key instanceof CArray && iv instanceof CArray ){ 
		  if(enc)
				this.ptr = Module._crypto_encrypt_new(1024, key.ptr, iv.ptr)
		  else
				this.ptr = Module._crypto_decrypt_new(1024, key.ptr, iv.ptr)
		  }else{
				throw "key or IV is not a CArray"
		  }
	 }
	 
	 Update(data, output) {
		  var l = Module._crypto_update(this.ptr, data.ptr, data.len, output.ptr, output.len)
		  return l
	 }

	 Finish(output){
		  return Module._crypto_finalize(this.ptr, output.ptr, output.len)
	 }

	 Dispose(){
		  Module._crypto_delete(this.ptr)
	 }

	 static Encryptor(key, iv){
		  return new Cipher(key, iv, true)
	 }
	 static Decryptor(key, iv){
		  return new Cipher(key, iv, false)
	 }
}

function wrapStream(str){
	 let rd = str.getReader();
	 return new ReadableStream(
		  {
				async pull(controller){
					 let r = await rd.read()
					 const {value, done} = r;
					 if (done){
						  controller.close();
						  return;
					 }
					 controller.enqueue(value);
				}
		  }
	 );
}



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
	 let padded = pass.padEnd(32, " ")
	 let key = CArray.FromString(padded)
	 let decryptor = Cipher.Decryptor(key, iv)
	 iv.Dispose()
	 key.Dispose()
	 var rest = value.subarray(16)
	 var restDec = null
 	 if(rest && rest.length > 0 ){
		  let c1 = CArray.FromArray(rest)
		  let buffer = CArray.FromSize(rest.length + 16)
		  
		  let l = decryptor.Update(c1, buffer)
		  if(l > 0){
				//console.log("pull: ", c1.ToArray(), "->", buffer.ToArray())								
				restDec = buffer.GetSlice(0, l).ToArray()
		  }
		  c1.Dispose()
		  buffer.Dispose()
		  rest = null
	 }
	 let rd2 = new ReadableStream(
		  {
				start(controller){
					 if(restDec){
						  controller.enqueue(restDec)
						  restDec = null;
					 }
				},
				
				async pull(controller){
					 let r = await rd.read()
					 const {value, done} = r;

					 if (done){
						  
						  let buffer = CArray.FromSize(16)
						  let l = decryptor.Finish(buffer)
						  let chunk = buffer.GetSlice(0, l).ToArray();
						  //console.log("pull done", chunk)
						  if(l > 0)
								controller.enqueue(chunk)
						  buffer.Dispose()
						  controller.close()
						  decryptor.Dispose()
						  return;
					 }
					 const chunkSize = 1024 * 512 
					 for(var i = 0; i < value.length; i =+ chunkSize){
						  let subarray = value.subarray(i, i + Math.min(value.length -i, chunkSize))
						  let c1 = CArray.FromArray(subarray)
		
						  let buffer = CArray.FromSize(c1.len + 16 * 2)
						  //buffer.Clear()

						  let l = decryptor.Update(c1, buffer)
						  let chunk = buffer.GetSlice(0, l).ToArray()
						  //console.log("chunk", l, chunk, subarray, value, buffer.ToArray())
						  //console.log("pull part", chunk)
						  controller.enqueue(chunk)
						  c1.Dispose()
						  buffer.Dispose()
					 }
				}
		  }
	 );
	 return rd2
}
