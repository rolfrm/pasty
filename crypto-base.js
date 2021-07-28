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
		  return new Uint8Array(this.GetView())
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
		  Module._free(this.ptr)
		  this.ptr = undefined
		  this.len = undefined
	 }

	 static FromSize(size){
		  var fill = new Uint8Array(size)
		  var ptr = Module._malloc(size)
		  writeArrayToMemory(fill, ptr)
		  return new CArray(ptr, size)
	 }
	 
	 static FromArray(array) {
		  var strptr = allocate(array, ALLOC_NORMAL);
		  return new CArray(strptr, array.length);
	 }
	 static FromString(str) {
		  var arrayValues = intArrayFromString(str)
		  return CArray.FromArray(arrayValues)
	 }
}

class Cipher {
	 constructor(key, iv, enc){
		  if(enc)
				this.ptr = Module._crypto_encrypt_new(1024, key.ptr, iv.ptr)
		  else
				this.ptr = Module._crypto_decrypt_new(1024, key.ptr, iv.ptr)
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
