
let form  = document.getElementById('fileSelector');
let file_elem = document.getElementById('selectedFile');
let progress = document.getElementById('upload-progress')
let table = document.getElementById('session-files')

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
	cell1.innerHTML = x.file;
	cell2 = row.insertCell(2);
	cell2.innerHTML = "<input type=\"checkbox\"></input>"
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

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    var fileList = file_elem.files;
    var file = fileList[0];
    var req = new XMLHttpRequest();
    
    req.onload = function(e){
	sessionData.files.push({ name: file.name, file: req.response})
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
    req.send(file);
});


getSelected = function(){
    items = []

    for (var i = 0, row; row = table.rows[i]; i++) {
	if(row.cells[2].childNodes[0].checked)
	    items.push(row.data);
    }
    return items;

}


deleteSelected = function(){
    toRemove = getSelected();

    for(const x of toRemove){

	var req = new XMLHttpRequest();
	
	req.open("get", "/delete?file=" + x.file);
	req.send();
	req.onload = function(e){
	    console.log("Deleted " + x.file);
	}
	
    }

    sessionData.files = sessionData.files.filter(x => toRemove.indexOf(x) < 0);
    updateSessionData();
    saveSessionData();

}
