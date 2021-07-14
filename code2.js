let form  = document.getElementById('fileSelector');
let file_elem = document.getElementById('selectedFile');
let progress = document.getElementById('upload-progress')
let table = document.getElementById('session-files')

trunc3 = function(s,p ){
    return Math.trunc(s / p) * p;
    
}

trunc2 = function(s){
    return trunc3(s, 0.01).toFixed(2);
}

getSizeString = function(s){
    if(s < 1000)
	return s.toString() + " B"
    if(s < 1000000)
	return trunc2(s / 1000, 0.1).toString() + " kB";
    if(s < 1000000000)
	return trunc2(s / 1000000,0.1).toString() + " MB";
    
    return trunc2(s / 1000000000,0.1).toString() + " GB";
    
}

sessionData = {
    files: [
	{name : "hej", file: "asdasd"},
	{name: "hejhej", file: "asdasd2"}
    ]
}

saveSessionData = function(data){
    str = JSON.stringify(data);
    localStorage.setItem('sessions', str);
}

loadSessionData = function(){
    if (localStorage.getItem('sessions')) {
	try {
	    return JSON.parse(localStorage.getItem('sessions'));
	} catch(e) {
	    localStorage.removeItem('sessions');
	}
    }
    return null;
}

clearTable = function(){
    while(table.rows.length > 1)
	table.deleteRow(1);
}

updateSessionData = function() {
    clearTable();
    for(const x of sessionData.files){
	row = table.insertRow(1);
	cell0 = row.insertCell(0);
	cell0.innerHTML = "<a href=\"/download?file=" + x.file + "\" download=\"" + x.name +"\">" +x.name + "</a>";
	cell1 = row.insertCell(1);
	cell1.innerHTML = getSizeString(x.size);
	cell2 = row.insertCell(2);
	cell2.innerHTML = x.file;
	cell3 = row.insertCell(3);
	cell3.innerHTML = "<input type=\"checkbox\"></input>"
	row.data = x;
    }
}

{ // load session data from local storage
    var newSessionData = loadSessionData();
    if(newSessionData && newSessionData.files){
	sessionData = newSessionData;
    }
}
updateSessionData();

function uploadFile1(){
    var fileList = file_elem.files;
    var file = fileList[0];
    var req = new XMLHttpRequest();
    
    req.onload = function(e){
	sessionData.files.push({ name: file.name, file: req.response, size: file.size})
	updateSessionData();
	saveSessionData(sessionData)
    }
    req.open("post", "/upload");
    function updateProgress (oEvent) {
	if (oEvent.lengthComputable) {
	    var percentComplete = oEvent.loaded / oEvent.total * 100;
	    progress.value = percentComplete;
	}
    }

    req.upload.addEventListener("progress", updateProgress);
    req.send(file.stream());
}

function to_ws(s) {
    var l = window.location;
    return ((l.protocol === "https:") ? "wss://" : "ws://") + l.host + s;
}

function min(a, b){
    if (a < b) return a;
    return b;
}

function connectWs(url){
    return new Promise(function(resolve, reject) {
        var server = new WebSocket(url);
        server.onopen = function() {
            resolve(server);
        };
        server.onerror = function(err) {
	    reject(err);
	    
        };
	server.xmessages = [];
	server.readers = [];

	server.onclose = function(){
	    while(true){
		reader = server.readers.shift();
		if(reader){
		    reader.reject("Connection closed");
		}else{
		    break;
		}
	    }
	};
	
	server.onmessage = function(msg) {
	    reader = server.readers.shift();
	    if(reader){
		reader.resolve(msg);
	    }else{
		server.xmessages.push(msg)
	    }
	}
	server.readAsync = function(){
	    return new Promise(function(resolve, reject){
		msg = server.xmessages.shift()
		server.readers.push({resolve: resolve, reject: reject})
	    });
	}
    });
}

async function uploadFile2(){
    var socket = await connectWs(to_ws("/upload-ws"));
    var fileList = file_elem.files;
    var file = fileList[0];
    socket.send(new BigInt64Array([BigInt(file.size)]));
    
    reader = file.stream().getReader()
    while(true){
	result = await reader.read()
	if(result.done)
	    break;
	console.log(result);
	socket.send(result.value);	
    }

    var msg = await socket.readAsync();
    console.log(msg.data);
    msg = await socket.readAsync();
    console.log(msg.data);
    
    socket.close();

}


form.addEventListener('submit', async (event) => {
    event.preventDefault();
    uploadFile2();
});


getSelected = function(){
    items = []

    for (var i = 0, row; row = table.rows[i]; i++) {
	if(row.cells[3].childNodes[0].checked)
	    items.push(row.data);
    }
    return items;

}


deleteSelected = function(){
    toRemove = getSelected();

    for(const x of toRemove){
	var req = new XMLHttpRequest();
	req.open("get", "/delete?file=" + x.file);
	req.onload = function(e){
	    console.log("Deleted " + x.file);
	}
	req.send();
    }

    sessionData.files = sessionData.files.filter(x => toRemove.indexOf(x) < 0);
    updateSessionData();
    saveSessionData(sessionData);

}


function AESTransformStream() {
    return new TransformStream({
	transform(chunk, controller) {
            controller.enqueue(chunk)
	}
    });
}
