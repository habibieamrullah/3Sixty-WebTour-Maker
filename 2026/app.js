//3Sixty app.js

var apppath = require('electron').remote.app.getAppPath();

// Create temp directory if not exists
const tempDir = __dirname + '/temp';
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}


var wtmdata = {
	projects : [],
};


if(localStorage.getItem("wtmdata") === null){
	saveWtmdata();
}else{
	loadWtmdata();
}


function saveWtmdata() {
    try {
        // Validasi sebelum save
        if (!wtmdata || !Array.isArray(wtmdata.projects)) {
            wtmdata = { projects: [] };
        }
        
        // Backup ke localStorage dengan validasi
        const jsonStr = JSON.stringify(wtmdata);
        // Test parse dulu
        JSON.parse(jsonStr);
        localStorage.setItem("wtmdata", jsonStr);
    } catch (err) {
        console.error('Error saving wtmdata:', err);
        showAlert('Save Error', 'Failed to save application data.');
    }
}



// Auto backup setiap 5 menit untuk project yang sedang diedit
let autoBackupInterval;

function startAutoBackup() {
    if (autoBackupInterval) clearInterval(autoBackupInterval);
    
    autoBackupInterval = setInterval(() => {
        if (currentprojectindex !== undefined && currentprojectdata) {
            console.log('Auto-backup triggered');
            backupWtmFile(wtmdata.projects[currentprojectindex].projectdir);
        }
    }, 5 * 60 * 1000); // 5 menit
}

function stopAutoBackup() {
    if (autoBackupInterval) {
        clearInterval(autoBackupInterval);
        autoBackupInterval = null;
    }
}

// Mulai auto backup saat app load
startAutoBackup();


function recoverProjectFromBackup() {
    if (!currentprojectindex) {
        showAlert('No Project', 'Please open a project first.');
        return;
    }
    
    const projectDir = wtmdata.projects[currentprojectindex].projectdir;
    const backupDir = path.join(projectDir, 'backups');
    
    if (!fs.existsSync(backupDir)) {
        showAlert('No Backups', 'No backups found for this project.');
        return;
    }
    
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.wtm.backup'))
        .sort()
        .reverse();
    
    if (backups.length === 0) {
        showAlert('No Backups', 'No backups found for this project.');
        return;
    }
    
    let backupList = '<h3>Available Backups:</h3>';
    backups.forEach((backup, index) => {
        const stats = fs.statSync(path.join(backupDir, backup));
        const date = new Date(stats.mtime).toLocaleString();
        backupList += `
            <div style="margin: 10px 0; padding: 10px; background-color: #3d4855;">
                <div><strong>${backup}</strong></div>
                <div>Date: ${date}</div>
                <button onclick="restoreBackup(${index})" class="greenbutton" style="margin-top: 5px;">
                    <i class="fa fa-undo"></i> Restore
                </button>
            </div>
        `;
    });
    
    showAlert('Recover Project', backupList + '<button onclick="hideDim()">Close</button>');
}

function restoreBackup(backupIndex) {
    const projectDir = wtmdata.projects[currentprojectindex].projectdir;
    const backupDir = path.join(projectDir, 'backups');
    
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.wtm.backup'))
        .sort()
        .reverse();
    
    const backupPath = path.join(backupDir, backups[backupIndex]);
    const wtmPath = path.join(projectDir, 'WTMProject.wtm');
    
    try {
        // Backup current file first
        if (fs.existsSync(wtmPath)) {
            const corruptBackup = wtmPath + '.corrupt.' + Date.now();
            fs.copyFileSync(wtmPath, corruptBackup);
        }
        
        // Restore backup
        fs.copyFileSync(backupPath, wtmPath);
        
        // Reload project
        currentprojectdata = safeLoadWtmFile(projectDir);
        showeditorc("panoramas");
        hideDim();
        
        showAlert('Success', 'Project restored from backup.');
    } catch (err) {
        console.error('Error restoring backup:', err);
        showAlert('Error', 'Failed to restore backup.');
    }
}

// Shortcut untuk recovery (Ctrl+Shift+R)
$(window).keydown(function(e) {
    if (e.ctrlKey && e.shiftKey && e.which == 82) { // R
        recoverProjectFromBackup();
        e.preventDefault();
    }
});


function loadWtmdata() {
    try {
        const stored = localStorage.getItem("wtmdata");
        if (stored) {
            const parsed = JSON.parse(stored);
            // Validasi struktur
            if (parsed && Array.isArray(parsed.projects)) {
                wtmdata = parsed;
            } else {
                throw new Error('Invalid localStorage data');
            }
        } else {
            wtmdata = { projects: [] };
            saveWtmdata();
        }
    } catch (err) {
        console.error('Error loading wtmdata, resetting:', err);
        wtmdata = { projects: [] };
        saveWtmdata();
        showAlert('Data Reset', 'Application data was corrupted and has been reset.');
    }
}


function reloadApp(){
	location.reload();
}




// Fungsi untuk backup file WTM
function backupWtmFile(projectDir) {
    try {
        const wtmPath = path.join(projectDir, 'WTMProject.wtm');
        const backupDir = path.join(projectDir, 'backups');
        
        // Buat folder backup jika belum ada
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        // Cek apakah file WTM ada
        if (fs.existsSync(wtmPath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `WTMProject_${timestamp}.wtm.backup`);
            
            // Copy file ke backup
            fs.copyFileSync(wtmPath, backupPath);
            
            // Hapus backup lama (misal > 10 backup)
            cleanupOldBackups(backupDir, 10);
            
            console.log(`Backup created: ${backupPath}`);
        }
    } catch (err) {
        console.error('Error creating backup:', err);
    }
}

// Hapus backup lama
function cleanupOldBackups(backupDir, maxBackups) {
    try {
        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.wtm.backup'))
            .map(f => ({
                name: f,
                path: path.join(backupDir, f),
                time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
            }))
            .sort((a, b) => b.time - a.time); // Sort by newest first
        
        // Hapus backup yang melebihi maxBackups
        if (files.length > maxBackups) {
            for (let i = maxBackups; i < files.length; i++) {
                fs.unlinkSync(files[i].path);
                console.log(`Removed old backup: ${files[i].name}`);
            }
        }
    } catch (err) {
        console.error('Error cleaning up backups:', err);
    }
}

// Validasi data sebelum menulis
function isValidProjectData(data) {
    // Cek apakah data adalah object valid
    if (!data || typeof data !== 'object') return false;
    
    // Cek properti minimal yang harus ada
    if (!data.title) data.title = 'Untitled Project';
    if (!Array.isArray(data.panoramas)) return false;
    if (!data.settings || typeof data.settings !== 'object') return false;
    
    return true;
}

// Fungsi save dengan backup dan validasi
function safeSaveWtmFile(projectDir, data) {
    try {
        const wtmPath = path.join(projectDir, 'WTMProject.wtm');
        
        // Validasi data
        if (!isValidProjectData(data)) {
            console.error('Invalid project data, not saving');
            return false;
        }
        
        // Backup dulu
        backupWtmFile(projectDir);
        
        // Tulis ke file temporary dulu
        const tempPath = wtmPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
        
        // Validasi file temporary bisa dibaca
        const tempData = fs.readFileSync(tempPath, 'utf8');
        JSON.parse(tempData); // Throw error jika invalid
        
        // Jika valid, rename temp file ke file asli
        fs.renameSync(tempPath, wtmPath);
        
        console.log('Project saved safely');
        return true;
    } catch (err) {
        console.error('Error saving project:', err);
        showAlert('Save Error', 'Failed to save project. Your project has been backed up.');
        return false;
    }
}

// Fungsi load dengan backup otomatis jika korup
function safeLoadWtmFile(projectDir) {
    try {
        const wtmPath = path.join(projectDir, 'WTMProject.wtm');
        
        if (!fs.existsSync(wtmPath)) {
            return createNewProjectData();
        }
        
        const data = fs.readFileSync(wtmPath, 'utf8');
        
        // Coba parse JSON
        try {
            const parsed = JSON.parse(data);
            
            // Validasi struktur
            if (!isValidProjectData(parsed)) {
                throw new Error('Invalid project structure');
            }
            
            return parsed;
        } catch (parseErr) {
            console.error('Project file corrupted, attempting to recover...');
            
            // Coba cari backup terbaru
            const backupDir = path.join(projectDir, 'backups');
            if (fs.existsSync(backupDir)) {
                const backups = fs.readdirSync(backupDir)
                    .filter(f => f.endsWith('.wtm.backup'))
                    .sort()
                    .reverse();
                
                if (backups.length > 0) {
                    const latestBackup = path.join(backupDir, backups[0]);
                    console.log(`Attempting to recover from: ${latestBackup}`);
                    
                    const backupData = fs.readFileSync(latestBackup, 'utf8');
                    const recovered = JSON.parse(backupData);
                    
                    if (isValidProjectData(recovered)) {
                        // Copy backup ke file utama
                        fs.copyFileSync(latestBackup, wtmPath);
                        showAlert('Project Recovered', 'Your project was corrupted but has been recovered from backup.');
                        return recovered;
                    }
                }
            }
            
            // Jika tidak ada backup, buat project baru
            showAlert('Project Corrupted', 'Your project file was corrupted. A new project has been created.');
            return createNewProjectData();
        }
    } catch (err) {
        console.error('Fatal error loading project:', err);
        return createNewProjectData();
    }
}

// Buat data project baru
function createNewProjectData() {
    return {
        title: 'New Project',
        panoramas: [],
        settings: {
            firstpanorama: '',
            loadingtext: 'Loading...',
            description: '',
            controls: 0,
            panolistmenu: 0
        },
        tourmap: '',
        threedeescenes: []
    };
}





function loadRecentProjects(){
	$("#recentprojects").html("");
	if(wtmdata.projects.length > 0){
		for(var i = 0; i < wtmdata.projects.length; i++){
			if (fs.existsSync(wtmdata.projects[i].projectdir)) {
				
				$("#recentprojects").prepend("<div class='projectlist'><div style='cursor: pointer;' onclick='editproject("+i+")'><div style='font-size: 20px;'>" +wtmdata.projects[i].projectname+ "</div><div style='font-size: 12px; color: #eba576;'>" +wtmdata.projects[i].projectdir+ "</div></div><div class='button' style='margin-bottom: 0px; font-size: 10px;' onclick=showInExplorer(" +i+ ")><i class='fa fa-folder'></i> Show in Explorer</div><div class='redbutton' style='margin-bottom: 0px; font-size: 10px;' onclick=removeFromProjectList(" +i+ ")><i class='fa fa-trash'></i> Remove from List</div></div>");
				
			}else{
				
				$("#recentprojects").prepend("<div class='projectlist'><div style='color: #e76d6d; font-style: italic;'><div style='font-size: 20px;'><i class='fa fa-warning'></i> " +wtmdata.projects[i].projectname+ " (Not Found)</div><div style='font-size: 12px; color: #e76d6d;'>" +wtmdata.projects[i].projectdir+ "</div></div><div class='redbutton' style='margin-bottom: 0px; font-size: 10px;' onclick=removeFromProjectList(" +i+ ")><i class='fa fa-trash'></i> Remove from List</div></div>");
				
			}
		}
		$(".projectlist").hide();
		var num = 0;
		$(".projectlist").each(function(){
			$(".projectlist").eq(num).delay(num * 100).fadeIn();
			num++;
		});
		limitHeight();
	}else{
		$("#recentprojects").html("No project found.");
	}
}


function removeFromProjectList(index){
	showYesNoAlert("Are you sure?", "Remove this project from the Project list? You will need to remove the directory from your hard drive manually to completely delete it from your computer.", function(){
		wtmdata.projects.splice(index, 1);
		saveWtmdata();
		loadRecentProjects();
	});
}


const { exec } = require("child_process");
const os = require("os");


function openFolder(dir) {
  let command;


  switch (os.platform()) {
    case "win32": // Windows
      // start "" "C:\path with spaces"
      command = `start "" "${dir}"`;
      break;
    case "darwin": // macOS
      // open "/Users/.../folder with spaces"
      command = `open "${dir}"`;
      break;
    default: // Linux
      // xdg-open "/home/.../folder with spaces"
      command = `xdg-open "${dir}"`;
      break;
  }


  exec(command, (err) => {
    if (err) {
      console.error("Failed to open folder:", err);
    }
  });
}


function showInExplorer(idx) {
  const dir = wtmdata.projects[idx].projectdir;
  console.log("Trying to open in dir:", dir);
  openFolder(dir);
}


function browseInExplorer(dir){
	dir = apppath + "\\" + dir;
	require('child_process').exec('start "" ' + dir);
}


function isProjectExist(title, dir){
	for(var i = 0; i < wtmdata.projects.length; i++){
		if(wtmdata.projects[i].projectdir == dir)
			return true;
	}
	return false;
}


loadRecentProjects();


function previewProject(idx){
    generateHTMLPanoramas();
    showDim("Building...");
    setTimeout(function(){
        var ppath = wtmdata.projects[idx].projectdir + "/index.html";
        
        // Cek apakah pakai electronAPI atau remote
        if (window.electronAPI) {
            window.electronAPI.previewProject(ppath);
        } else {
            var newwin = new (require('electron').remote.BrowserWindow)({ 
                width: 1280, 
                height: 720, 
                title: "Project Preview", 
                icon: "icon.ico" 
            });
            newwin.loadFile(ppath);
            newwin.removeMenu();
        }
        
        hideDim();
    }, 2000);
}


function generatePanoramas(arr) {
	var pdata = "";	
	
	if (arr.length > 0) {
		for (var i = 0; i < arr.length; i++) {
			var panovar = arr[i].panofile;

			pdata += `
			if (panorama === '${panovar}') {
			`;

			for (var x = 0; x < arr[i].hotspots.length; x++) {
				var hicon = arr[i].hotspots[x].icon !== undefined ? arr[i].hotspots[x].icon : 0;

				pdata += "	addHotspot('images/"+hicon+"', new THREE.Vector3("+arr[i].hotspots[x].position.split(',')[0]+", "+arr[i].hotspots[x].position.split(',')[1]+", " + arr[i].hotspots[x].position.split(',')[2] + "), () => {\n";

				if (arr[i].hotspots[x].actions.length > 0) {
					var cactions = arr[i].hotspots[x].actions;
					for (var y = 0; y < cactions.length; y++) {
						var actiontype = cactions[y].type;
						if (actiontype == 0) {
							// Open Panorama
							var targetpanorama = cactions[y].target;
							// Jika target mengandung slash, ambil bagian terakhir (nama file)
							if (targetpanorama.indexOf('/') > -1) {
								targetpanorama = targetpanorama.split('/').pop();
							}
							if (targetpanorama.indexOf('.jpg') > -1 || targetpanorama.indexOf('.jpeg') > -1 || targetpanorama.indexOf('.png') > -1) {
								pdata += `		switchPanorama('${targetpanorama}');\n`;
							} else {
								pdata += `		switchPanorama('${targetpanorama}');\n`;
							}
						} else if (actiontype == 5) {
							// Open 3D Scene - PASTIKAN MENGGUNAKAN sceneId
							var target = cactions[y].target;
							var sceneId = target.replace("3dscene:", "");
							pdata += `		switchTo3DScene('${sceneId}');\n`;
						}
					}
				}

				if (arr[i].hotspots[x].url && arr[i].hotspots[x].url !== "") {
					pdata += `		window.open('${arr[i].hotspots[x].url}', '_blank');\n`;
				}

				if (arr[i].hotspots[x].js && arr[i].hotspots[x].js !== "") {
					pdata += `		${arr[i].hotspots[x].js}\n`;
				}

				pdata += `	});\n`;
			}

			pdata += `}\n`;
		}
	}

	return pdata;
}




function hideDim(){
	$("#dim").fadeOut();
	$("#loading").hide();
}


function showDim(message){
	$("#dimmessage").html(message);
	$("#dim").show();
	$("#loading").show();
}


function showAlert(title, message){
	$("#dimmessage").html("<div style='width: 70%; max-width: 400px; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-info-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div style='user-select: text;'>" +message+ "</div><button onclick='hideDim()' style='margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
}


function showImage(title, image){
	$("#dimmessage").html("<div style='width: 70%; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-image'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal; overflow: hidden;'><div style='text-align: center; overflow: hidden;'><img src='"+image+"' style='display: inline-block; height: 100%; max-height: 400px;'></div><button onclick='hideDim()' style='margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
}


var doit;
function showYesNoAlert(title, message, fn){
	$("#dimmessage").html("<div style='width: 70%; max-width: 400px; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-question-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div>" +message+ "</div><button onclick='doit(); hideDim();' style='margin-top: 20px; margin-bottom: 0px; margin-right: 10px;'><i class='fa fa-check'></i> Yes</button><button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> No</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
	
	doit = function(){
		fn();
	}
}


function showItemChooser(cid, title, dir, fn){
	
	doit = function(){fn()};


	var itemstochoose = "";
	var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/" + dir + "/";
		if (!fs.existsSync(workingdir)){
			fs.mkdirSync(workingdir);
		}
		function extokay(dir, ext){
			if(dir == "images"){
				if(ext == "JPG" || ext == "jpg" || ext == "jpeg" || ext == "png")
					return true;
			}else if(dir == "panoramas"){
				if(ext == "JPG" || ext == "jpg" || ext == "jpeg" || ext == "png")
					return true;
			}else if(dir == "videos"){
				if(ext == "mp4")
					return true;
			}else if(dir == "audios"){
				if(ext == "mp3")
					return true;
			}else if(dir == "pdf"){
				if(ext == "pdf")
					return true;
			}else{
				return false;
			}
		}
		
		function fthumb(fname){
			var ext = fname.split(".")[fname.split(".").length-1];
			if( ext == "JPG" || ext == "jpg" || ext == "jpeg" || ext == "png" ){
				return "<div style='margin-bottom: 10px;'><img src='" + workingdir + "/" + fname + "' style='height: 96px'></div>";
			}else if(ext == "mp4"){
				return "<div style='margin-bottom: 10px;'><i class='fa fa-film' style='font-size: 60px;'></i></div>";
			}else if(ext == "mp3"){
				return "<div style='margin-bottom: 10px;'><i class='fa fa-music' style='font-size: 60px;'></i></div>";
			}else if(ext == "pdf"){
				return "<div style='margin-bottom: 10px;'><i class='fa fa-file-pdf-o' style='font-size: 60px;'></i></div>";
			}
		}
		
		fs.readdirSync(workingdir).forEach(file =>{
		
			if(extokay(dir, file.split(".")[file.split(".").length-1])){
				itemstochoose += "<div onclick='setChosenItem(\""+cid+"\", \""+dir+"/"+file+"\")' style='display: inline-block; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer;'><div>" + fthumb(file) + "</div><div style='font-size: 10px;'>" + truncate(file, 20) + "</div></div>";
			}
			
			
		});
	
	$("#dimmessage").html("").html("<div style='width: 100%; max-width: 720px; height: 100%; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-question-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div style='box-sizing: border-box; width: 100%; height: "+(innerHeight-400)+"px; overflow: auto;'>"+itemstochoose+"</div><button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
}


//Showing hotspot icon chooser
function showIconChooser(cid, title){


	/*
	var itemstochoose = "";
	
	for(var i = 0; i < hotspotIcons.length; i++){
		itemstochoose += "<div onclick='setHotspotIcon(\""+cid+"\", \""+hotspotIcons[i].data+"\")' style='display: inline-block; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer;'><div><img src='" +wtmdata.projects[currentprojectindex].projectdir + "/images/" + hotspotIcons[i].data+ "' style='height: 96px;'></div><div style='font-size: 10px;'>" + hotspotIcons[i].name + "</div></div>";
	}
	
	$("#dimmessage").html("").html("<div style='width: 100%; max-width: 720px; height: 100%; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-question-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div style='box-sizing: border-box; width: 100%; height: "+(innerHeight-400)+"px; overflow: auto;'>"+itemstochoose+"</div><button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
	*/
	
	showItemChooser(0, "Choose an Image as your Hotspot Icon", "images", function(){
		/*
		var res = isCidMatched(cid);							
		currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 1, target : tempSourceFile });
		console.log("Action added");
		updateWtmFile();
		showeditorc("hotspots");
		hideDim();
		*/
		
		//alert("tadaa! " + tempSourceFile);
		setHotspotIcon(cid, tempSourceFile.replace("images/", ""));
	});
}


//Set chosen item after showing the item chooser
function setChosenItem(cid, file){
	tempSourceFile = file;
	doit();
}


//Set chosen item of hotspot icon
function setHotspotIcon(cid, idx){
	var res = isCidMatched(cid);
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].icon = idx;
	updateWtmFile();
	showeditorc("hotspots");
	hideDim();
}


function showMiniPage(type){
	switch (type){
		case "about" :
			showAlert("About", "<h1>3Sixty Virtual Tour Maker</h1><h3>3Sixty 1.5.4 - 29.1.26</h3><p>Made with:</p><div style='background-color: white;'><img src='imgs/poweredby.png' style='width: 100%;'></div><p style='margin-top: 20px;'>Developed by</p><a href='https://webappdev.id/'><img src='imgs/webappdev.png' style='width: 100%'></a><p><a href='#' onclick=showMiniPage('donate')>Support The Development</a><br><a href='https://3sixty.webappdev.my.id/'>Visit 3Sixty Website</a></p>");
			break;
		case "donate" :
			showAlert("Support The Development", "<p><img src='imgs/pleasedonate.png' style='background-color: white; padding: 20px;'></p><p>This software is made for you for free. However, I expect any amount donations from users like you to keep me supported for maintenance and further development of this software.</p><p><a href='https://ciihuy.com/supportus/?lang=en'>DONATE NOW</a></p>");
			break;
		case "tourmap" :
			showAlert("How to use Tour Map", "<div style='text-align: left;'><p>You can use Tour Map for navigation between panorama scenes.</p><p>- Double click your Hotspot to add an Action<br>- X+Click to delete Hotspot<br>- Currently there is no feature to resize Hotspot icon; so use your own image editor to resize the hotspot icons you are using related to the Tour Map background image.<p></div>");
			break;
	}
}


hideDim();


function quitprogram(){
	console.log("Metusik");
	ipcRenderer.send("quitprogram");
}


function minimize(){
	var currentWindow = BrowserWindow.getFocusedWindow();
	currentWindow.minimize();
}


function maximize(){
	var window = BrowserWindow.getFocusedWindow();
	if(window.isMaximized()){ 
		window.unmaximize(); 
		$(".minmaxbutton").html("<i class='fa fa-window-maximize'></i>");
	}else{ 
		window.maximize(); 
		$(".minmaxbutton").html("<i class='fa fa-window-restore'></i>");
	}
}


function showpage(pid){
	$(".page").hide();
	$("#" + pid).fadeIn();
	switch(pid){
		case "projects" :
			loadRecentProjects();
			break;
	}
	limitHeight();
}


//Function to generate random characters
function randomblah(length){
	var result = '';
	var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	var charactersLength = characters.length;
	for ( var i = 0; i < length; i++ ) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
}


//Function to truncate string
function truncate(str, n){
	return (str.length > n) ? str.substr(0, n-1) + '&hellip;' : str;
};


var currentprojectindex;
var currentpanoramaindex;
var currentprojectdata;
var tempstring; 
var tempTimeout;
function editproject(idx){
    currentprojectindex = idx;
    showpage("projecteditor");
    $("#currentprojecttitle").val(wtmdata.projects[idx].projectname);
    
    $("#currentprojectdir").html("<i class='fa fa-folder' style='width: 30px;'></i>" + wtmdata.projects[idx].projectdir).attr({ "onclick" : "showInExplorer(" + idx + ")" });
    
    // CARA 1: Hapus dulu event lama, baru tambah
    $("#currentprojectrunbutton").off('click').on('click', function() {
        previewProject(idx);
    });
    
    // Atau CARA 2: Pake data attribute
    $("#currentprojectrunbutton").data('project-idx', idx).off('click').on('click', function() {
        var projectIdx = $(this).data('project-idx');
        previewProject(projectIdx);
    });
    
    fs.readFile(wtmdata.projects[idx].projectdir + "/WTMProject.wtm", 'utf8', function (err, data) {
        if(err){
            showAlert("Project Corrupted", "Sorry this project can not be opened.");
            showpage("projects");
            return;
        }
        currentprojectdata = JSON.parse(data);
        showeditorc("panoramas");
    });
}


//tour map functions


//set tour map bg image
function setTourMapImage(){
	showItemChooser(0, "Choose an Image as your map", "images", function(){
		/*
		var res = isCidMatched(cid);							
		currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 1, target : tempSourceFile });
		console.log("Action added");
		updateWtmFile();
		showeditorc("hotspots");
		hideDim();
		*/
		currentprojectdata.tourmap = {
			image : tempSourceFile,
			scale : 0.75,
			hotspots : [],
		};
		updateWtmFile();
		hideDim();
		showeditorc("tourmap");
		//alert("tadaa! " + tempSourceFile);
	});
}


//add tour map hotspot icon dialog
function addTourMapHotspotDialog(){
	showItemChooser(0, "Choose an Image as your hotpsot", "images", function(){
		currentprojectdata.tourmap.hotspots.push({
			image : tempSourceFile,
			posX : 0,
			posY : 0,
			actions : [],
			destpano : "",
		});
		updateWtmFile();
		hideDim();
		showeditorc("tourmap");
		//alert("tadaa! " + tempSourceFile);
	});
}


//update map pin positions after drag 
function updateMapPinPositions(){
	for(var i = 0; i < currentprojectdata.tourmap.hotspots.length; i++){
		currentprojectdata.tourmap.hotspots[i].posX = (parseFloat($(".mappin").eq(i).css("left")) / (parseInt($("#mapwrapper").css("width"))) * 100 );
		currentprojectdata.tourmap.hotspots[i].posY = (parseFloat($(".mappin").eq(i).css("top")) / (parseInt($("#mapwrapper").css("height"))) * 100 );
		
	}
	updateWtmFile();
}


//show map pin action dialog
function showMapPinActions(pinid){
	showItemChooser(0, "Choose Destination Panorama", "panoramas", function(){
		//currentprojectdata.tourmap.hotspots[pinid].destpano = tempSourceFile.split(".")[0].split("/")[1];
		currentprojectdata.tourmap.hotspots[pinid].destpano = tempSourceFile.split("/")[1];
		updateWtmFile();
		hideDim();
	});
}


//delete tour Map
function delTourMap(){
	currentprojectdata.tourmap = "";
	updateWtmFile();
	showeditorc("tourmap");
	
}


//generate editor content
var isOnTourmap = false;
function showeditorc(type){
	isOnTourmap = false;
	switch(type){
		case "tourmap" : 
			isOnTourmap = true;
			$("#editorcontent").html("<h2>Tour Map</h2><div id='tourmapcontent'></div>");
			
			if(currentprojectdata.tourmap === undefined || currentprojectdata.tourmap == ""){
				$("#tourmapcontent").html("<p>You don't have any tour map yet.</p><button class='greenbutton' onclick='setTourMapImage()'><i class='fa fa-plus'></i> Create Tour Map</button>");
			}else{
				
				var maphotspots = "";
				for(var i = 0; i < currentprojectdata.tourmap.hotspots.length; i++){
					maphotspots += "<img class='mappin' id='mappin"+i+"' src='"+wtmdata.projects[currentprojectindex].projectdir + "/" +currentprojectdata.tourmap.hotspots[i].image+"' style='top: "+currentprojectdata.tourmap.hotspots[i].posY+"%; left: "+currentprojectdata.tourmap.hotspots[i].posX+"%' ondblclick='showMapPinActions("+i+")'>";
				}
				
				$("#tourmapcontent").html("<div><button class='greenbutton' onclick='addTourMapHotspotDialog()'><i class='fa fa-plus'></i> Add Hotspot</button><button onclick=showMiniPage('tourmap'); style='margin-left: 0.5em;'><i class='fa fa-question-circle'></i> How To</button><button onclick='delTourMap();' style='margin-left: 0.5em;'><i class='fa fa-trash'></i> Delete Tour Map</button></div><div id='mapwrapper'><img id='mapbgimage' src='"+ wtmdata.projects[currentprojectindex].projectdir + "/" + currentprojectdata.tourmap.image+"'>"+maphotspots+"</div>");
				
				resizetourmap();
				$( ".mappin").draggable({
					stop:function(){
						updateMapPinPositions();
						//alert($(".mappin").eq(0).css("top"));
					}
				});
				
				let xKeyDown = false;


				$(document).on('keydown', function(e) {
					if (e.key.toLowerCase() === 'x') {
					  xKeyDown = true;
					}
				});


				$(document).on('keyup', function(e) {
					if (e.key.toLowerCase() === 'x') {
					  xKeyDown = false;
					}
				});


				$(".mappin").on('click', function() {
				  if (xKeyDown) {
					var mappinid = $(this).attr("id").replace("mappin", "");
					mappinid = parseInt(mappinid); // pastikan jadi angka
					currentprojectdata.tourmap.hotspots.splice(mappinid, 1); // hapus 1 item di index tsb
					$(this).remove(); // hapus elemen dari DOM
					updateWtmFile(); // simpan perubahan
				  }
				});
				
			}
			
			break;
			
		case "panoramas" :
			var panoramas = "<h2>Panorama Images</h2>";
			for(var i = 0; i < currentprojectdata.panoramas.length; i++){
				var itsmainpano = "";
				var itsmainpanogreen = "background-color: #eba576; color: black;";
				var itsmainpanoaction = " onclick='setitasmainpano(" +i+ ")'";
				var itsmainpanotrash = "";


				var panofile = wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + currentprojectdata.panoramas[i].panofile;
				var panoUrl = toFileUrl(panofile);


				if(currentprojectdata.panoramas[i].panofile == currentprojectdata.settings.firstpanorama){
					itsmainpano = "<i class='fa fa-home'></i> ";
					itsmainpanogreen = "background-color: #0d9e59; color: white;";
					itsmainpanoaction = " onclick='showAlert(\"Main Panorama\", \"This panorama is already set as Main Panorama\");'";
					itsmainpanotrash = " display: none;";
				}
				panoramas += "<div class='imgthumb' style='position: relative; background: url(" + panoUrl + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'><span"+itsmainpanoaction+" style='"+itsmainpanogreen+" cursor: pointer; font-weight: bold; padding: 5px; font-size: 10px;'>" + itsmainpano + truncate(currentprojectdata.panoramas[i].panofile, 15) + "</span><div style='position: absolute; bottom: 0; right: 0;'><div onclick=\"showImage('"+currentprojectdata.panoramas[i].panofile+"', '" + wtmdata.projects[currentprojectindex].projectdir+"/panoramas/"+currentprojectdata.panoramas[i].panofile + "');\" class='greenbutton'><i class='fa fa-eye'></i></div><div onclick='removePanorama(" +i+ ")' class='redbutton' style='" +itsmainpanotrash+ "'><i class='fa fa-trash'></i></div></div></div>";
			}
			$("#editorcontent").html(panoramas + "<div class='imgthumb' onclick='addpanorama()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 40px;'></i></div></div></div>");
			break;
		case "settings" :
			var cbsetting = "";
			if(currentprojectdata.settings.controls == 1)
				cbsetting = " selected";
			var panolistmenu = "";
			if(currentprojectdata.settings.panolistmenu == 1)
				panolistmenu = " selected";
			$("#editorcontent").html("<h2>Project Settings</h2><div style='display: table; width: 100%; table-layout: fixed;'><div style='display: table-cell; vertical-align: top; padding-right: 10px;'><p>Project Description</p><input placeholder='Short description' id='psdescription' value='" +currentprojectdata.settings.description+ "'><p>Panorama Loading Text</p><input id='psloadingtext' placeholder='Loading text' value='" +currentprojectdata.settings.loadingtext+ "'><p>Show Panorama List Menu</p><select id='panolistmenu'><option value=0>No</option><option value=1"+panolistmenu+">Yes</option></select></div><div style='display: table-cell; vertical-align: top;'><p>Main Panorama (First panorama to load)</p><select id='firstpanorama'>" +getPanoramasNameOption()+ "</select><p>Show Panolens Control Buttons (bottom right)</p><select id='pscontrols'><option value=0>No</option><option value=1"+cbsetting+">Yes</option></select></div></div><button onclick='saveProjectSettings()'><i class='fa fa-floppy-o'></i> Save</button>");
			//<p>Default Tour Mode</p><select><option>Normal</option><option>Cardboard</option><option>Stereoscopic</option></select>
			break;
		case "hotspots" :
			ReloadEditorHotspots();
			break;
			
		case "imageassets" :
			var imagefiles = "";
			var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/images/";
			if (!fs.existsSync(workingdir)){
				fs.mkdirSync(workingdir);
			}
			fs.readdirSync(workingdir).forEach(file =>{
				if(file.split(".")[file.split(".").length-1] == "JPG" || file.split(".")[file.split(".").length-1] == "jpg" || file.split(".")[file.split(".").length-1] == "jpeg" || file.split(".")[file.split(".").length-1] == "png"){


					var oriimagefile = wtmdata.projects[currentprojectindex].projectdir+"/images/"+file;
					var imagefileurl = toFileUrl(oriimagefile);
					imagefiles += "<div class='imgthumb' style='position: relative; background: url(" + imagefileurl + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'><span style='background-color: black; color: white; font-weight: bold; padding: 5px; font-size: 10px;'>" + truncate(file, 20) + "</span><div style='position: absolute; bottom: 0; right: 0;'><div onclick=\"showImage('"+file+"', '" + wtmdata.projects[currentprojectindex].projectdir+"/images/"+file + "');\" class='greenbutton'><i class='fa fa-eye'></i></div><div onclick=removeImageasset('"+wtmdata.projects[currentprojectindex].projectdir+"/images/"+file+"') class='redbutton'><i class='fa fa-trash'></i></div></div></div>";
				
				}
				
			});
			$("#editorcontent").html("<h2>Image Assets</h2>" + imagefiles + "<div class='imgthumb' onclick='addImageasset()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 40px;'></i></div></div></div>");
			
			break;
		
		case "videos" :
			var tmpfiles = "";
			var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/videos/";
			if (!fs.existsSync(workingdir)){
				fs.mkdirSync(workingdir);
			}
			fs.readdirSync(workingdir).forEach(file =>{
				if(file.split(".")[file.split(".").length-1] == "mp4"){
					tmpfiles += "<div style='display: inline-block; margin-right: 20px; margin-bottom: 20px;'><div style='display: table;'><div style='background-color: #2c3643; display: table-cell; padding: 10px;'><i class='fa fa-film'></i> " + truncate(file, 30) + "</div><div class='redbutton' style='margin: 0px; padding: 10px; display: table-cell;' onclick=removeVideofile('"+wtmdata.projects[currentprojectindex].projectdir+"/videos/"+file+"')><i class='fa fa-trash'></i></div></div></div>";
				}
			});
			$("#editorcontent").html("<h2>Videos</h2><div>"+tmpfiles+"</div><div class='imgthumb' style='height: 50px; width: 250px;' onclick='addVideofile()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 20px;'></i> Add New File</div></div></div>");
			break;
		case "audios" :
			var tmpfiles = "";
			var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/audios/";
			if (!fs.existsSync(workingdir)){
				fs.mkdirSync(workingdir);
			}
			fs.readdirSync(workingdir).forEach(file =>{
				if(file.split(".")[file.split(".").length-1] == "mp3"){
					tmpfiles += "<div style='display: inline-block; margin-right: 20px; margin-bottom: 20px;'><div style='display: table;'><div style='background-color: #2c3643; display: table-cell; padding: 10px;'><i class='fa fa-film'></i> " + truncate(file, 30) + "</div><div class='redbutton' style='margin: 0px; padding: 10px; display: table-cell;' onclick=removeAudiofile('"+wtmdata.projects[currentprojectindex].projectdir+"/audios/"+file+"')><i class='fa fa-trash'></i></div></div></div>";
				}
			});
			$("#editorcontent").html("<h2>Audios</h2><div>"+tmpfiles+"</div><div class='imgthumb' style='height: 50px; width: 250px;' onclick='addAudiofile()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 20px;'></i> Add New File</div></div></div>");
			break;
		case "pdfs" :
			var tmpfiles = "";
			var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/pdf/";
			if (!fs.existsSync(workingdir)){
				fs.mkdirSync(workingdir);
			}
			fs.readdirSync(workingdir).forEach(file =>{
				if(file.split(".")[file.split(".").length-1] == "pdf"){
					tmpfiles += "<div style='display: inline-block; margin-right: 20px; margin-bottom: 20px;'><div style='display: table;'><div style='background-color: #2c3643; display: table-cell; padding: 10px;'><i class='fa fa-file-pdf-o'></i> " + truncate(file, 30) + "</div><div class='redbutton' style='margin: 0px; padding: 10px; display: table-cell;' onclick=removePdffile('"+wtmdata.projects[currentprojectindex].projectdir+"/pdf/"+file+"')><i class='fa fa-trash'></i></div></div></div>";
				}
			});
			$("#editorcontent").html("<h2>PDF Documents</h2><div>"+tmpfiles+"</div><div class='imgthumb' style='height: 50px; width: 250px;' onclick='addPdffile()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 20px;'></i> Add New File</div></div></div>");
			break;
	}
	limitHeight();
}


//HOTSPOTS Operations//
//Show add new action dialog
function hotShowAddNewAction(cid){
	$("#hotscreen"+cid).hide().html("<div><h4>Select Action</h4></div><select id='haction"+cid+"' onchange=showactioncontent('"+cid+"')><option>Choose one...</option><option value=1>Open Panorama</option><option value=2>Show Image</option><option value=3>Play a Video</option><option value=4>Play an Audio</option><option value=5>Open a PDF file</option><option value=6>Open URL</option><option value=7>Execute JavaScript code</option><option value=8>Open 3D Scene</option></select><div id='hotactioncontent"+cid+"'></div><div class='button' onclick=showeditorc('hotspots') style='margin: 5px;'><i class='fa fa-floppy-o'></i> Save</div><div class='button' onclick=hotGoHome(\""+cid+"\") style='margin: 5px;'><i class='fa fa-times'></i> Close</div>").show();
	$("#hothome" + cid).hide();
}


//showactioncontent
function showactioncontent(cid){
	var currentaction = parseInt($("#haction"+cid).val());
	var acontent = "";
	var res = isCidMatched(cid);				
	switch(currentaction){
		case 1 :
			acontent = "<p>Destination Panorama:</p><input placeholder='Click to choose...' readonly onclick='hchoose(0, \""+cid+"\");'>";
			break;
		case 2 :
			acontent = "<p>Image to open:</p><input placeholder='Click to choose...' readonly onclick='hchoose(1, \""+cid+"\");'>";
			break;
		case 3 :
			acontent = "<p>Video to play:</p><input placeholder='Click to choose...' readonly onclick='hchoose(2, \""+cid+"\");'>";
			break;
		case 4 :
			acontent = "<p>Audio to play:</p><input placeholder='Click to choose...' readonly onclick='hchoose(3, \""+cid+"\");'>";
			break;
		case 5 :
			acontent = "<p>PDF file to open:</p><input placeholder='Click to choose...' readonly onclick='hchoose(4, \""+cid+"\");'>";
			break;
		case 6 :
			var currenthurl = "";
			if(currentprojectdata.panoramas[res.pano].hotspots[res.hot].url != undefined)
				currenthurl = currentprojectdata.panoramas[res.pano].hotspots[res.hot].url;
			acontent = "<p>URL to open:</p><input placeholder='https://example.com' id='hactionurlinput"+cid+"' onkeyup='savehactionurl(\""+cid+"\")' value='"+currenthurl+"'>";
			break;
		case 7 :
			var currenthjs = "";
			if(currentprojectdata.panoramas[res.pano].hotspots[res.hot].js != undefined)
				currenthjs = currentprojectdata.panoramas[res.pano].hotspots[res.hot].js;
			acontent = "<p>JavaScript code to execute:</p><textarea placeholder='Write your JS here...' id='hactionjsinput"+cid+"' onkeyup='savehactionjs(\""+cid+"\")'>"+currenthjs+"</textarea>";
			break;
		case 8 : // Open 3D Scene
			acontent = "<p>Destination 3D Scene:</p><input placeholder='Click to choose...' readonly onclick='hchoose(5, \""+cid+"\");'>";
			break;
	}
	$("#hotactioncontent"+cid).html(acontent);
}


//Show configs panel
function hotShowConfigs(cid){
	var projectdir = wtmdata.projects[currentprojectindex].projectdir;
	var hotspoticon = "default.png";
	var res = isCidMatched(cid);
	var currenthotspot = currentprojectdata.panoramas[res.pano].hotspots[res.hot];
	if(currenthotspot.icon != undefined && currenthotspot.icon != ""){
		hotspoticon = "/" + currenthotspot.icon;


	}


	var oriimagefile = projectdir+hotspoticon;
	var imagefileurl = toFileUrl(oriimagefile);


	var hotspotfilename = hotspoticon.split("/")[hotspoticon.split("/").length-1];
	var stoh = "";
	if(currenthotspot.stoh != undefined && currenthotspot.stoh == 1){
		stoh = " selected";
	}
	$("#hothome" + cid).hide();
	
	
	$("#hotscreen"+cid).hide().html("<h4>Configs</h4><p>Current Hotspot icon<br>(Click to change):</p><div onclick='changehotspoticon(\""+cid+"\");' style='width: 92px; height: 92px; margin: 0 auto; margin-bottom: 20px; background: url("+imagefileurl+") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'></div><input value='"+hotspotfilename+"' readonly onclick='changehotspoticon(\""+cid+"\");'><!--<p>Show title on hover</p><select id='showtitleonhover"+cid+"' onchange='applyshowtoh(\""+cid+"\")'><option value=0>No</option><option value=1"+stoh+">Yes</option></select>--><p>Current Hotspot location<br>(Click the input below to change)</p><input value='"+currenthotspot.position+"' readonly><div class='button' onclick=hotGoHome(\""+cid+"\") style='margin: 5px;'><i class='fa fa-floppy-o'></i> Save</div><div class='button' onclick=hotGoHome(\""+cid+"\") style='margin: 5px;'><i class='fa fa-times'></i> Close</div>").show();
}


//Go hot home
function hotGoHome(cid){
	$("#hothome"+cid).hide().show();
	$("#hotscreen"+cid).hide();
}


//save haction url
function savehactionurl(cid){
	clearTimeout(tempTimeout);
	tempTimeout = setTimeout(function(){
		var urltoopen = $("#hactionurlinput"+cid).val();
		if(urltoopen.indexOf("http") > -1){
			console.log("Action URL: " + urltoopen);
			var res = isCidMatched(cid);				
			currentprojectdata.panoramas[res.pano].hotspots[res.hot].url = urltoopen;
			updateWtmFile();
		}
	}, 1000);
}


//save haction js
function savehactionjs(cid){
	clearTimeout(tempTimeout);
	tempTimeout = setTimeout(function(){
		var jstorun = $("#hactionjsinput"+cid).val();
		if(jstorun != ""){
			console.log("Saving JS code: " + jstorun);
			var res = isCidMatched(cid);
			currentprojectdata.panoramas[res.pano].hotspots[res.hot].js = jstorun;
			updateWtmFile();
		}
	}, 1000);
}


//hchoose for add actions
function hchoose(type, cid){
	switch(type){
		case 0 :
			showItemChooser(cid, "Choose Destination Panorama", "panoramas", function(){
				var res = isCidMatched(cid);
				// Untuk panorama, simpan hanya nama file (ambil setelah slash terakhir)
				var targetFile = tempSourceFile;
				if (tempSourceFile.indexOf('/') > -1) {
					targetFile = tempSourceFile.split('/').pop();
				}
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 0, target : targetFile });
				console.log("Action added: Open Panorama - " + targetFile);
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 1 :
			showItemChooser(cid, "Choose an Image", "images", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 1, target : tempSourceFile });
				console.log("Action added: Show Image - " + tempSourceFile);
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 2 :
			showItemChooser(cid, "Choose a Video", "videos", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 2, target : tempSourceFile });
				console.log("Action added: Play Video - " + tempSourceFile);
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 3 :
			showItemChooser(cid, "Choose an Audio", "audios", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 3, target : tempSourceFile });
				console.log("Action added: Play Audio - " + tempSourceFile);
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 4 :
			showItemChooser(cid, "Choose a PDF", "pdf", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 4, target : tempSourceFile });
				console.log("Action added: Open PDF - " + tempSourceFile);
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 5 : // Open 3D Scene
			show3DSceneChooser(cid, "Choose 3D Scene", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 5, target : tempSourceFile });
				console.log("3D Scene action added: " + tempSourceFile);
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
	}
}

// Show 3D Scene chooser
function show3DSceneChooser(cid, title, fn){
	
	doit = function(){fn()};

	var itemstochoose = "";
	
	if (currentprojectdata.threedeescenes && currentprojectdata.threedeescenes.length > 0) {
		for(var i = 0; i < currentprojectdata.threedeescenes.length; i++){
			var scene = currentprojectdata.threedeescenes[i];
			itemstochoose += `
				<div onclick='setChosen3DScene("${cid}", ${i})' 
					 style='display: inline-block; width: 200px; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer; 
					        background-color: #2c3643; padding: 15px; border-radius: 5px;'>
					<div><i class='fa fa-cube' style='font-size: 48px; color: #eba576;'></i></div>
					<div style='font-weight: bold; margin-top: 10px;'>${scene.name}</div>
					<div style='font-size: 11px; color: #eba576;'>${scene.objects ? scene.objects.length : 0} objects</div>
				</div>
			`;
		}
	} else {
		itemstochoose = "<p>No 3D scenes available. Please create a 3D scene first.</p>";
	}
	
	$("#dimmessage").html("").html(`
		<div style='width: 100%; max-width: 800px; height: 100%; margin: 0 auto;'>
			<div style='background-color: #2c3643; color: white; padding: 10px;'>
				<i class='fa fa-cube'></i> ${title}
			</div>
			<div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'>
				<div style='box-sizing: border-box; width: 100%; height: ${(innerHeight-400)}px; overflow: auto;'>
					${itemstochoose}
				</div>
				<button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'>
					<i class='fa fa-times'></i> Close
				</button>
			</div>
		</div>
	`);
	$("#dim").show();
	$("#loading").hide();
}

// Set chosen 3D scene
function setChosen3DScene(cid, sceneIndex) {
    var sceneId = currentprojectdata.threedeescenes[sceneIndex].id;
    tempSourceFile = "3dscene:" + sceneId; // Simpan dengan prefix
    doit();
}

//Is Cid Matched?
function isCidMatched(cid){
	for(var i = 0; i < currentprojectdata.panoramas.length; i++){
		for(var x = 0; x < currentprojectdata.panoramas[i].hotspots.length; x++){
			if(currentprojectdata.panoramas[i].hotspots[x].hotspotid == cid){
				return { pano : i, hot : x };
			}
		}
	}
	return false;
}


//Apply show title on hover or not
function applyshowtoh(cid){
	//alert("Stoh: " + $("#showtitleonhover"+cid).val());
	var sthohval = parseInt($("#showtitleonhover"+cid).val());
	var res = isCidMatched(cid);
	if(sthohval == 1)
		currentprojectdata.panoramas[res.pano].hotspots[res.hot].stoh = true;
	else
		currentprojectdata.panoramas[res.pano].hotspots[res.hot].stoh = false;
	updateWtmFile();
}


//Show file chooser for hotspot
function changehotspoticon(cid){
	showIconChooser(cid, "Choose a Hotspot Icon");
}


//For deleting an action
function removhaction(aindex, cid){
	var res = isCidMatched(cid);
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.splice(aindex, 1);
	updateWtmFile();
	showeditorc("hotspots");
}


//Delete hotspot url
function removhurl(cid){
	var res = isCidMatched(cid);
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].url = undefined;
	updateWtmFile();
	showeditorc("hotspots");
}


//Delete hotspot url
function removhjs(cid){
	var res = isCidMatched(cid);
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].js = undefined;
	updateWtmFile();
	showeditorc("hotspots");
}


//Function for dynamically renaming hotspot title
function renameHotspotTitle(pidx, hidx){
	tempstring = $("#hinput" + currentprojectdata.panoramas[pidx].hotspots[hidx].hotspotid).val();
	//console.log(tempstring);
	clearTimeout(tempTimeout);
	tempTimeout = setTimeout(function(){
		if(tempstring != ""){
			//console.log("Hotspot renamed to: " + tempstring);
			//console.log("pidx: " + pidx + ", hidx: " + hidx);
			currentprojectdata.panoramas[pidx].hotspots[hidx].title = tempstring;
			updateWtmFile();
			//generateHTMLPanoramas();
		}
	}, 1000);
}


//Adding new hotspot
function addNewHotspotFor(idx){
	currentpanoramaindex = idx;
	var hotpath = __dirname + "/hotspotmaker.html";
	var panofile = currentprojectdata.panoramas[idx].panofile;
	var panopath = wtmdata.projects[currentprojectindex].projectdir + "/panoramas/";
	var panoname = panofile.split(".")[0];
	//Let's copy current panorama file to temp panorama directory
	fse.copySync(wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + panofile, __dirname + '/temp/' + panofile);
	fs.readFile(hotpath, 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		var newhtml = data.split("/*initfunction*/")[0] +"/*initfunction*/\n\r" + 
		
		`
		let currentPanorama = '${panofile}';
		function init() {
			const container = document.getElementById('container');


			scene = new THREE.Scene();


			camera = new THREE.PerspectiveCamera(targetFov, container.clientWidth / container.clientHeight, 0.1, 1000);
			camera.position.set(0, 0, 0.1);


			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setSize(container.clientWidth, container.clientHeight);
			container.appendChild(renderer.domElement);


			controls = new THREE.OrbitControls(camera, renderer.domElement);
			controls.enableZoom = true;
			controls.minDistance = 0.1;
			controls.maxDistance = 5;
			controls.enablePan = false;
			controls.rotateSpeed = -0.3;
			controls.enableDamping = true;
			controls.dampingFactor = 0.1;


			const geometry = new THREE.SphereGeometry(500, 60, 40);
			geometry.scale(-1, 1, 1);


			const texture = new THREE.TextureLoader().load('${panopath}${panofile}');
			const material = new THREE.MeshBasicMaterial({ map: texture });


			panoramaMesh = new THREE.Mesh(geometry, material);
			scene.add(panoramaMesh);


			loadHotspotsFor('${panofile}');


			window.addEventListener('resize', onWindowResize);
			renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
			renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
			renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
			renderer.domElement.addEventListener('pointermove', onPointerMove, false);
		}
		`
		
		 +
		"\n\r/*initfunction-end*/" + data.split("/*initfunction-end*/")[1];
		fs.writeFile(hotpath, newhtml, function (err) {
			if (err) return console.log(err);
			
			var hoteditor = new BrowserWindow({ 
				width: 1280, 
				height : 720, 
				title : "Add New Hotspot", 
				icon: "3Sixty.ico",
				webPreferences : { 
					contextIsolation: false,
					webSecurity: false,
					nodeIntegration: true,
					enableRemoteModule: true,
				} 
			});
			//hoteditor.webContents.openDevTools();
			hoteditor.loadFile(hotpath);
			hoteditor.removeMenu();
			
			
		});
	});
}


//Re-positioning hotspot
function reSetHotspotPosition(pidx, hidx){
	//showAlert("Repositioning hotspot", "zzz");
	currentpanoramaindex = pidx;
	var hotpath = __dirname + "/hotspotmaker.html";
	var panofile = currentprojectdata.panoramas[pidx].panofile;
	var panopath = wtmdata.projects[currentprojectindex].projectdir + "/panoramas/";
	var panoname = panofile.split(".")[0];
	//Let's copy current panorama file to temp panorama directory
	fse.copySync(wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + panofile, __dirname + '/temp/' + panofile);
	fs.readFile(hotpath, 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		var newhtml = data.split("/*initfunction*/")[0] +"/*initfunction*/\n\r" + 
		
		`
		let currentPanorama = '${panofile}';
		function init() {
			const container = document.getElementById('container');


			scene = new THREE.Scene();


			camera = new THREE.PerspectiveCamera(targetFov, container.clientWidth / container.clientHeight, 0.1, 1000);
			camera.position.set(0, 0, 0.1);


			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setSize(container.clientWidth, container.clientHeight);
			container.appendChild(renderer.domElement);


			controls = new THREE.OrbitControls(camera, renderer.domElement);
			controls.enableZoom = true;
			controls.minDistance = 0.1;
			controls.maxDistance = 5;
			controls.enablePan = false;
			controls.rotateSpeed = -0.3;
			controls.enableDamping = true;
			controls.dampingFactor = 0.1;


			const geometry = new THREE.SphereGeometry(500, 60, 40);
			geometry.scale(-1, 1, 1);


			const texture = new THREE.TextureLoader().load('${panopath}${panofile}');
			const material = new THREE.MeshBasicMaterial({ map: texture });


			panoramaMesh = new THREE.Mesh(geometry, material);
			scene.add(panoramaMesh);


			loadHotspotsFor('${panofile}');


			window.addEventListener('resize', onWindowResize);
			renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
			renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
			renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
			renderer.domElement.addEventListener('pointermove', onPointerMove, false);
		}
		`
		
		 +
		"\n\reditinghotspot=true; editinghotspotidx = "+hidx+"\n\r/*initfunction-end*/" + data.split("/*initfunction-end*/")[1];
		fs.writeFile(hotpath, newhtml, function (err) {
			if (err) return console.log(err);
			
			var hoteditor = new BrowserWindow({ 
				width: 1280, 
				height : 720, 
				title : "Add New Hotspot", 
				icon: "3Sixty.ico",
				webPreferences : { 
					nodeIntegration: true,
					enableRemoteModule: true,
					webSecurity: false,
					nodeIntegration: true,
				} 
			});
			//hoteditor.webContents.openDevTools();
			hoteditor.loadFile(hotpath);
			hoteditor.removeMenu();
			
			//hoteditor.webContents.openDevTools();
		});
	});
}


//Removing Hotspot
function removehotspot(cid){
	showYesNoAlert("Remove Hotspot", "Are you sure to remove this Hotspot?", function(){
		var cp = currentprojectdata.panoramas;
		for(var i = 0; i < cp.length; i++){
			var cph = cp[i].hotspots;
			for(var x = 0; x < cph.length; x++){
				if(cph[x].hotspotid == cid){
					currentprojectdata.panoramas[i].hotspots.splice(x, 1);
					break;
				}
			}
		}
		updateWtmFile();
		showeditorc("hotspots");
	});
}


//Adding new image asset
function addImageasset(){
	pointToFile(["JPG", "jpg", "jpeg", "png"], function(){
		showDim("Adding new file...");
		setTimeout(function(){
			tempDestinationDirectory = wtmdata.projects[currentprojectindex].projectdir + "/images/";
			addFile(function(){
				setTimeout(function(){hideDim(); showeditorc("imageassets");},500);
			});
		}, 500);
		
	});
}
//Removing image asset
function removeImageasset(f){
	showDim("Removing the file. Please wait...");
	deleteFile(f);
	setTimeout(function(){hideDim(); showeditorc("imageassets");},500);
}


//Adding new video file
function addVideofile(){
	pointToFile(["mp4"], function(){
		showDim("Adding new file...");
		setTimeout(function(){
			tempDestinationDirectory = wtmdata.projects[currentprojectindex].projectdir + "/videos/";
			addFile(function(){
				setTimeout(function(){hideDim(); showeditorc("videos");},500);
			});
		},500);					
	});
}
//Removing video file
function removeVideofile(f){
	showDim("Removing the file. Please wait...");
	deleteFile(f);
	setTimeout(function(){hideDim(); showeditorc("videos");},500);
}


//Adding new audio file
function addAudiofile(){
	pointToFile(["mp3"], function(){
		showDim("Adding new file...");
		setTimeout(function(){
			tempDestinationDirectory = wtmdata.projects[currentprojectindex].projectdir + "/audios/";
			addFile(function(){
				setTimeout(function(){hideDim(); showeditorc("audios");},500);
			});
		},500);					
	});
}
//Removing audio file
function removeAudiofile(f){
	showDim("Removing the file. Please wait...");
	deleteFile(f);
	setTimeout(function(){hideDim(); showeditorc("audios");},500);
}


//Adding new pdf file
function addPdffile(){
	pointToFile(["pdf"], function(){
		showDim("Adding new file...");
		setTimeout(function(){
			tempDestinationDirectory = wtmdata.projects[currentprojectindex].projectdir + "/pdf/";
			addFile(function(){
				setTimeout(function(){hideDim(); showeditorc("pdfs");},500);
			});
		}, 500);
		
	});
}
//Removing pdf file
function removePdffile(f){
	showDim("Removing the file. Please wait...");
	deleteFile(f);
	setTimeout(function(){hideDim(); showeditorc("pdfs");},500);
}


function setitasmainpano(idx){
	currentprojectdata.settings.firstpanorama = currentprojectdata.panoramas[idx].panofile;
	updateWtmFile();
	console.log("New home panorama has been set: " + currentprojectdata.panoramas[idx].panofile);
	showeditorc("panoramas");
}


var toglobalwrite = true;
function saveProjectSettings(){
	showDim("Saving project...");
	var newtitle = $("#psloadingtext").val();
	var newdescription = $("#psdescription").val();
	var firstpanorama = $("#firstpanorama").val();
	var newcontrols = parseInt($("#pscontrols").val());
	var panolistmenu = parseInt($("#panolistmenu").val());
	currentprojectdata.settings = {
		loadingtext : newtitle,
		firstpanorama : firstpanorama,
		description : newdescription,
		controls : newcontrols,
		panolistmenu : panolistmenu,
	};
	updateWtmFile();
	fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		
		toglobalwrite = true;
		
		//Update loading text
		var newhtml = data.split("<!--loadingtext--\>")[0] +"<!--loadingtext--\>"+ newtitle +"<!--loadingtext-end--\>"+ data.split("<!--loadingtext-end--\>")[1];
		
		//Update project title
		newhtml = newhtml.split("<!--projecttitle--\>")[0] +"<!--projecttitle--\><title\>"+ currentprojectdata.title +"</title\><!--projecttitle-end--\>"+ newhtml.split("<!--projecttitle-end--\>")[1];
		
		//Update project description
		newhtml = newhtml.split("<!--projectdescription--\>")[0] +"<!--projectdescription--\><meta name=\"description\" content=\""+newdescription+"\"><!--projectdescription-end--\>"+ newhtml.split("<!--projectdescription-end--\>")[1];
		


		//Update show or dont show panormas list
		if(currentprojectdata.settings.panolistmenu == 1){
			
			//generate panolist data;
			var panothumbs = "";
			for(var i = 0; i < currentprojectdata.panoramas.length; i++){
				panothumbs += "<div onclick=switchPanorama('" +currentprojectdata.panoramas[i].panofile+ "');><img src='panoramas/" + currentprojectdata.panoramas[i].panofile + "' style='height: 3em; padding: 0.5em;'></div>";
			}
			const panolistdata = "<div style='position: fixed; top: 0; left: 0; z-index: 1;'><div style='padding: 0.5em;' onclick=$('#panolist').toggle()><i class='fa fa-bars'></i></div></div><div id='panolist' style='position: fixed; top: 0; left: 0; bottom: 0; background-color: rgba(0,0,0,.85); backdrop-filter: blur(5px); overflow: auto; z-index: 1;'><div onclick=$(\'#panolist\').toggle() style='padding: 0.5em;'><i class='fa fa-chevron-left'></i> Hide</div>"+panothumbs+"</div>";




			var panolistscript = '$("body").append("'+panolistdata+'")';
			
			//check, has panolist block or not and insert code
			if(newhtml.indexOf("<!--panolist-->") > -1){
				console.log("Panolist block found.");
				newhtml = newhtml.split("<!--panolist-->")[0] + "<!--panolist--><script>" +panolistscript+ "</script><!--panolist-end-->" + newhtml.split("<!--panolist-end-->")[1];
			}else{
				console.log("Panolist block not found.");
				newhtml = newhtml.split("</body>")[0] + "<!--panolist--><script>" +panolistscript+ "</script><!--panolist-end--></body>" + newhtml.split("</body>")[1];
			}
			
			toglobalwrite = false;
			//write to file
			fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
				if (err) return console.log(err);
				
			});
			
		}else{
			if(newhtml.indexOf("<!--panolist-->") > -1){
				newhtml = newhtml.split("<!--panolist-->")[0] + newhtml.split("<!--panolist-end-->")[1];
			}
		}
		
		updatePanolistNavigation(newhtml, true);
		
		//write to file
		if(toglobalwrite){
			fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
				if (err) return console.log(err);
				
			});
		}
		
		showAlert("Project Settings", "Project Settings has been updated successfully.");
	});
}


function updatePanolistNavigation(newhtml, isSaveSettings){
	if(currentprojectdata.settings.panolistmenu == 1){
			
		//generate panolist data;
		var panothumbs = "";
		for(var i = 0; i < currentprojectdata.panoramas.length; i++){
			panothumbs += "<div onclick=switchPanorama('" +currentprojectdata.panoramas[i].panofile+ "');><img src='panoramas/" + currentprojectdata.panoramas[i].panofile + "' style='height: 3em; padding: 0.5em;'></div>";
		}
		const panolistdata = "<div style='position: fixed; top: 0; left: 0; z-index: 1;'><div style='padding: 0.5em;' onclick=$('#panolist').toggle()><i class='fa fa-bars'></i></div></div><div id='panolist' style='display: none; position: fixed; top: 0; left: 0; bottom: 0; background-color: rgba(0,0,0,.85); backdrop-filter: blur(5px); overflow: auto; z-index: 1;'><div onclick=$(\'#panolist\').toggle() style='padding: 0.5em; position: sticky; top: 0; background-color: black;'><i class='fa fa-chevron-left'></i> Hide</div>"+panothumbs+"</div>";




		var panolistscript = '$("body").append("'+panolistdata+'")';
		
		//check, has panolist block or not and insert code
		if(newhtml.indexOf("<!--panolist-->") > -1){
			console.log("Panolist block found.");
			newhtml = newhtml.split("<!--panolist-->")[0] + "<!--panolist--><script>" +panolistscript+ "</script><!--panolist-end-->" + newhtml.split("<!--panolist-end-->")[1];
		}else{
			console.log("Panolist block not found.");
			newhtml = newhtml.split("</body>")[0] + "<!--panolist--><script>" +panolistscript+ "</script><!--panolist-end--></body>" + newhtml.split("</body>")[1];
		}
		
		if(!isSaveSettings){
			return newhtml;
		}else{
			toglobalwrite = false;
			//write to file
			fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
				if (err) return console.log(err);
				
			});
		}
		
		
	}else{
		if(!isSaveSettings){
			return newhtml;
		}else{
			if(newhtml.indexOf("<!--panolist-->") > -1){
				newhtml = newhtml.split("<!--panolist-->")[0] + newhtml.split("<!--panolist-end-->")[1];
			}
		}
	}
}


function getPanoramasNameOption(){
	op = "";
	for(var i = 0; i < currentprojectdata.panoramas.length; i++){
		var panname = currentprojectdata.panoramas[i].panofile;
		if(panname == currentprojectdata.settings.firstpanorama)
			op += "<option selected='selected' value='"+panname+"'>" +panname+ "</option>";
		else
			op += "<option value='"+panname+"'>" +panname+ "</option>";
	}
	return op;
	
}


function addpanorama() {
	var newpanoramapath = "";
	dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{
			name: 'Images',
			extensions: ['jpg', 'jpeg', 'png', 'gif']
		}]
	}).then(result => {
		newpanoramapath = result.filePaths[0];
		if (newpanoramapath != undefined) {
			console.log(newpanoramapath);


			// Cross-platform way to get filename
			const newpanoramafile = remSpaces(path.basename(newpanoramapath));


			// Checking duplicate file name
			let finalFilename = newpanoramafile;
			if (foundduplicatepanofile(newpanoramafile)) {
				const ext = path.extname(newpanoramafile);
				const nameWithoutExt = path.basename(newpanoramafile, ext);
				finalFilename = `${nameWithoutExt}${randomblah(5)}${ext}`;
			}


			console.log("Selected file: " + finalFilename);


			// Create panoramas directory if it doesn't exist
			const panoramaDir = path.join(wtmdata.projects[currentprojectindex].projectdir, 'panoramas');
			fse.ensureDirSync(panoramaDir);


			// Copy file using proper path joining
			const destinationPath = path.join(panoramaDir, finalFilename);
			fse.copySync(newpanoramapath, destinationPath);


			console.log("New panorama file copied to:", destinationPath);


			// Update project data
			currentprojectdata.panoramas.push({
				panofile: finalFilename,
				hotspots: []
			});


			updateWtmFile();


			showDim("Please wait...");
			setTimeout(function () {
				showeditorc('panoramas');
				hideDim();
			}, 1000);
		}
	});
}


//Generating html for panorama changes
function generateHTMLPanoramas(){
	fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		
		//apply init codes
		var initcode = `
		let currentPanorama = '${currentprojectdata.settings.firstpanorama}';
		function init() {
			const container = document.getElementById('container');

			scene = new THREE.Scene();

			camera = new THREE.PerspectiveCamera(targetFov, container.clientWidth / container.clientHeight, 0.1, 1000);
			camera.position.set(0, 0, 0.1);

			renderer = new THREE.WebGLRenderer({ antialias: true });
			renderer.setSize(container.clientWidth, container.clientHeight);
			container.appendChild(renderer.domElement);

			controls = new THREE.OrbitControls(camera, renderer.domElement);
			controls.enableZoom = true;
			controls.minDistance = 0.1;
			controls.maxDistance = 5;
			controls.enablePan = false;
			controls.rotateSpeed = -0.3;
			controls.enableDamping = true;
			controls.dampingFactor = 0.1;

			const geometry = new THREE.SphereGeometry(500, 60, 40);
			geometry.scale(-1, 1, 1);

			const texture = new THREE.TextureLoader().load('panoramas/${currentprojectdata.settings.firstpanorama}');
			const material = new THREE.MeshBasicMaterial({ map: texture });

			panoramaMesh = new THREE.Mesh(geometry, material);
			scene.add(panoramaMesh);

			loadHotspotsFor('${currentprojectdata.settings.firstpanorama}');

			window.addEventListener('resize', onWindowResize);
			renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });
			renderer.domElement.addEventListener('touchstart', handleTouchStart, { passive: false });
			renderer.domElement.addEventListener('touchmove', handleTouchMove, { passive: false });
			renderer.domElement.addEventListener('pointermove', onPointerMove, false);
		}
		`;
		
		var newhtml = data.split("/*initfunction*/")[0] + "/*initfunction*/\n\r" + initcode + "\n\r/*initfunction-end*/" + data.split("/*initfunction-end*/")[1];
		
		//populate tourmap code
		var tourmapcode;
		
		if(currentprojectdata.tourmap === undefined || currentprojectdata.tourmap == ""){
			tourmapcode = ""
		} else {
			var tourmapicons = "";
			
			if(currentprojectdata.tourmap.hotspots.length > 0){
				for(var i = 0; i < currentprojectdata.tourmap.hotspots.length; i++){
					tourmapicons += '<img class=\"tmpin\" style=\"position: absolute; top:' + currentprojectdata.tourmap.hotspots[i].posY + '%; left:' + currentprojectdata.tourmap.hotspots[i].posX + '%;\" src=\"' + currentprojectdata.tourmap.hotspots[i].image + '\" onclick=tmOpenPano(\"' + currentprojectdata.tourmap.hotspots[i].destpano + '\")>';
				}
			}
			
			tourmapcode = "function tmOpenPano(pn){if(pn !=''){switchPanorama(pn);destroyTourMap();}};\n\rfunction destroyTourMap(){ $('#tourmap').remove(); };\n\rfunction showTourmap(){ $('body').append('<div id=\"tourmap\" style=\"z-index: 12; position: fixed; left: 0; right: 0; bottom: 0; top: 0; background-color: rgba(0,0,0,.9);\"><div id=\"tmcentered\"><div id=\"tmwrapper\" style=\"position: relative;\"><img id=\"tmbgimage\" src=\"" + currentprojectdata.tourmap.image + "\" style=\"width: 100%;\">" + tourmapicons + "</div></div><div onclick=destroyTourMap(); style=\"position: fixed; top: 0; right: 0; padding: 1em;\"><i class=\"fa fa-times\"></i></div></div>');\n\rsetTimeout(function(){resizePins();},250);};\n\r$('body').append('<div onclick=showTourmap(); style=\"position: fixed; top: 0; right: 0; padding: 1em;\"><i class=\"fa fa-map\"></i></div>');\n\rvar pinwidth=0.05;\n\rvar mapwidth=0.75;\n\rfunction resizePins(){$('#tmwrapper').width(innerWidth*mapwidth);\n\r$('#tmcentered').css({'margin-left':((innerWidth-$('#tmwrapper').width())/2)+'px','margin-top':((innerHeight-$('#tmwrapper').height())/2)+'px',});$('.tmpin').css({'width':$('#tmbgimage').width()*pinwidth+'px'});};\n\r$(window).on('resize',function(){resizePins();});\n\r$(document).ready(resizePins());";
		}
	
		//modify inside panoramas
		newhtml = newhtml.split("/*panoramas*/")[0] + "/*panoramas*/\n\r" + generatePanoramas(currentprojectdata.panoramas) + "\n\r/*panoramas-end*/" + data.split("/*panoramas-end*/")[1];
		
		//inject tourmap code
		newhtml = newhtml.split("/*customjs*/")[0] + "/*customjs*/\n\r" + tourmapcode + "\n\r/*customjs-end*/" + data.split("/*customjs-end*/")[1];
		
		// ============ TAMBAHAN UNTUK 3D SCENES ============
		// Generate 3D scenes data
		var threedeescenesData = "// 3D Scenes Data\n";
		if (currentprojectdata.threedeescenes && currentprojectdata.threedeescenes.length > 0) {
			// Buat object dengan ID sebagai key untuk memudahkan pencarian
			var scenesObject = {};
			for (var i = 0; i < currentprojectdata.threedeescenes.length; i++) {
				var scene = currentprojectdata.threedeescenes[i];
				scenesObject[scene.id] = scene;
			}
			threedeescenesData += "threeDScenes = " + JSON.stringify(scenesObject) + ";\n";
		} else {
			threedeescenesData += "threeDScenes = {};\n";
		}
		
		// Insert 3D scenes data - Gunakan penanda khusus
		if (newhtml.indexOf("/*threedeescenes-data*/") > -1) {
			// Jika penanda sudah ada, ganti konten di antaranya
			newhtml = newhtml.split("/*threedeescenes-data*/")[0] + 
					 "/*threedeescenes-data*/\n" + threedeescenesData + 
					 "\n/*threedeescenes-data-end*/" + 
					 newhtml.split("/*threedeescenes-data-end*/")[1];
		} else {
			// Jika penanda tidak ada, sisipkan sebelum </body>
			newhtml = newhtml.replace("</body>", 
				"<!--threedeescenes-data-->\n<script>\n" + threedeescenesData + "\n</script>\n<!--threedeescenes-data-end-->\n</body>");
		}
		// ============ AKHIR TAMBAHAN UNTUK 3D SCENES ============
		
		//Update project title
		newhtml = newhtml.split("<!--projecttitle--\>")[0] + "<!--projecttitle--\><title\>" + currentprojectdata.title + "</title\><!--projecttitle-end--\>" + newhtml.split("<!--projecttitle-end--\>")[1];
		
		//update panolist navigation
		newhtml = updatePanolistNavigation(newhtml, false);
		
		//write to file
		fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
			if (err) return console.log(err);
			console.log("Done regenerating new HTML after adding new panorama.");
		});
	});
}

//To remove panorama
function removePanorama(idx){
	showYesNoAlert("Remove this Panorama?", "Do you want to remove this panorama? You will also lost all the hotspots inside it.", function(){
		if(currentprojectdata.panoramas[idx].panofile == currentprojectdata.settings.firstpanorama){
			showAlert("Unable to Remove", "This panorama has been set as Main Panorama. You can not remove it unless you set another panorama file as Main Panorama.");
		}else{
			console.log("I choose to delete this panu, yeah!");
			console.log("So, remove this panu: " + currentprojectdata.panoramas[idx].panofile);
			deleteFile(wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + currentprojectdata.panoramas[idx].panofile);
			currentprojectdata.panoramas.splice(idx, 1);
			updateWtmFile();
			//generateHTMLPanoramas();
			showDim("Please wait...");
			setTimeout(function(){
				showeditorc('panoramas');
				hideDim();
			},1000);
		}
	});
}


var rnmttltimeout;
function renamecurrentproject(){
	var newtitle = $("#currentprojecttitle").val();
	if(newtitle.length > 3){
		clearTimeout(rnmttltimeout);
		rnmttltimeout = setTimeout(function(){
			//Read existing WTM data
			fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/WTMProject.wtm", 'utf8', function (err,data) {
				if (err) {
					return console.log(err);
				}
				var projectinfo = JSON.parse(data);
				projectinfo.title = newtitle;
				currentprojectdata.title = newtitle;
				//Then replace the WTM data with the updated one
				fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/WTMProject.wtm", JSON.stringify(projectinfo), function (err) {
					if (err) return console.log(err);
						//Then re-generate the HTML accordingly
						//First read the existing HTML content
						fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", 'utf8', function (err,data){
						if (err) {
							return false;
						}							
						//Then manipulate and place the new content
						var newhtml = data.split("<title\>")[0] + "<title>" +newtitle+ "</title>" + data.split("</title\>")[1];
						saveWtmdata();
						setTimeout(function(){
							fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
								if (err) return console.log(err);
								//If everything is done, save it!
								wtmdata.projects[currentprojectindex].projectname = newtitle;
								showAlert("Project Title Change", "New project title has been updated.");
							});
						}, 1000);
						
					});
				});
			});
		},1000);
	}
}


//Remove spaces
function remSpaces(txt){
	//txt.replace(/\s+/g, '').toLowerCase()
	txt = txt.replace(/-/g, "");
	txt = txt.replace(/\s+/g, '');
	if(isNumeric(txt)){
		txt = "pano3sixty" + txt;
	}
	return txt;
}


//check if string is numeric
function isNumeric(str) {
  if (typeof str != "string") return false // we only process strings!  
  return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
         !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
}


//FILE SYSTEM FUNCTIONS//


//FS delete file
function deleteFile(f){
	try {
		fs.unlinkSync(f)
		//file removed
	} catch(err) {
		console.error(err)
	}
}


//Showing open dialog file with callback
var tempSourceFile;
var tempDestinationFileName;
var tempDestinationDirectory;
function pointToFile(exts, fun) {
	//const path = require('path'); // Make sure to require path at the top of your file


	const doit = function () {
		fun();
	};


	dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [{
			name: 'Supported Files',
			extensions: exts,
		}]
	}).then(result => {
		if (!result.canceled && result.filePaths.length > 0) {
			tempSourceFile = result.filePaths[0];


			// Cross-platform way to get filename
			tempDestinationFileName = remSpaces(path.basename(tempSourceFile));


			console.log("Chosen file: " + tempDestinationFileName);
			doit();
		} else {
			console.log("Open Dialog canceled.");
		}
	});
}


//Add file with callback
function addFile(fun){
	//source file should be the tempSourceFile and destination shud be tempDestinationDirectory + tempDestinationFileName
	doit = function(){
		fun();
	}
	//Copy the file to the destination
	fse.copySync(tempSourceFile, tempDestinationDirectory + tempDestinationFileName);
	fun();
}


//A function to check is this file name is duplicated or not
function foundduplicatepanofile(filename){
	for(var i = 0; i < currentprojectdata.panoramas.length; i++){
		if(filename == currentprojectdata.panoramas[i].panofile)
			return true;
	}
	return false;
}


//Update the WTM File of current project
function updateWtmFile() {
    if (currentprojectindex !== undefined && wtmdata.projects[currentprojectindex]) {
        const projectDir = wtmdata.projects[currentprojectindex].projectdir;
        safeSaveWtmFile(projectDir, currentprojectdata);
    }
}




//fuckin messy click unclick menu blahblah
$(".subabitem").on("click", function(){
	setTimeout(function(){
		$(".dropdown-content", this).hide();
		topmenuclicked = false;
		$("#topmenudim").hide();
	},500);
});


var topmenuclicked = false;
$(".abitem").on("click", function(){
	$(".dropdown-content").hide();
	if(!topmenuclicked){
		$(".dropdown-content", this).show();
		topmenuclicked = true;
		$("#topmenudim").show();
	}else{
		topmenuclicked = false;
		$("#topmenudim").hide();
	}
});


$("#topmenudim, .rightbtn").on("click", function(){
	$(".dropdown-content").hide();
	topmenuclicked = false;
	$("#topmenudim").hide();
	$(".abitem").css({ "background-color" : "#2c3643" });
});


$(".abitem").not(".rightbtn").hover(function(){
	$(".dropdown-content").hide();
	$(".abitem").css({ "background-color" : "#2c3643" });
	$(this).css({ "background-color" : "#232c37" });
	if(topmenuclicked){
		$(".dropdown-content", this).show();
	}
},function(){
	if(!topmenuclicked){
		$(".dropdown-content").hide();
		$(this).css({ "background-color" : "#2c3643" });
	}
});


$(".closebutton").hover(function(){
	$(this).css({ "background-color" : "#cf0000" });
}, function(){
	$(this).css({ "background-color" : "#2c3643" });
});


$(".minmaxbutton, .minimizebutton").hover(function(){
	$(this).css({ "background-color" : "#0d9e59" });
}, function(){
	$(this).css({ "background-color" : "#2c3643" });
});


$(".page").on("click", function(){
	topmenuclicked = false;
});


showpage("projects");


function pleaseSupport(){
	//showAlert("Support the developer", "Please purchase the No Ads plugin to remove ads and support the developer. <a href='https://creativeshop.ciihuy.com/product/remove-ads-plugin-for-3sixty-virtual-tour-maker/'>Click here to purchase</a>.");
	
}


$(document).ready(function(){
	
	$("body").fadeIn();
	
	console.log = function(txt){
		//$("#debugwindowcontent").find("div").css({ "color" : "gray"});
		$("#debugwindowcontent").prepend("<div style='color: gray;'>" + txt + "</div>");
	}
	
	console.exception = console.error = console.debug = console.info = console.warn = console.log;
	
	$( function() {
		$( "#debugwindow" ).draggable();
		$( "#dimmessage" ).draggable();
		
	});
	
	ScanForPlugins();
	setTimeout(function(){
		pleaseSupport();
	},1500);
	
});








function limitHeight(){
	$("#recentprojects").css({ "height" : (innerHeight - 20) + "px", "overflow" : "auto" });
	$("#editorcontent").css({ "height" : (innerHeight - 200) + "px" });
	$("#tutorials").css({ "height" : (innerHeight - 20) + "px" });
	$("#maincontentwrapper").css({ "height" : (innerHeight - 50) + "px" });
	//alert("Resized by plugin");
	//alert("Size is: " + $("#editorcontent").height());
}


$(window).resize(function(){
	limitHeight();
	if(isOnTourmap){
		showeditorc("tourmap");
		setTimeout(function(){
			resizetourmap();
		},1000);		
	}
	
	
});


//resize tour map elements
function resizetourmap(){
	$("#mapwrapper").width(innerWidth*mapwidth);
	
	/*
	$("#centered").css({
		"margin-left" : ((innerWidth - $("#wrapper").width())/2) + "px",
		"margin-top" : ((innerHeight - $("#wrapper").height())/2) + "px",
	});
	*/
	
	var pinwidth = 0.05; //5 percent
	var mapwidth = 0.60; //80 percent of innerWidth
	$(".mappin").css({ 
		"width" : $("#mapbgimage").width() * pinwidth + "px" 
	});
	/*
	$(".mappin").css({
		"margin-left" : "-" + ($(".mappin").width() / 2) + "px",
		"margin-top" : "-" + ($(".mappin").height() / 2) + "px",
	});
	*/
}




//Hide Debug Window
function HideDebugWindow(){
	$("#debugwindow").hide();
}


//Hide Debug Window
function ShowDebugWindow(){
	$("#debugwindow").show();
	$("#debugwindow").css({
		top : innerHeight/2 - ($("#debugwindow").height()/2),
		left : innerWidth/2 - ($("#debugwindow").width()/2),
	});
}


//Open Dev Console
function OpenDevConsole(){
	//app.webContents.openDevTools();
}










//Keyboard Shortcuts


$(window).keydown(function(e){
	if(e.ctrlKey && e.which == 80){
		showpage("projects");
	}
	if(e.ctrlKey && e.which == 79){
		openproject();
	}
	if(e.ctrlKey && e.which == 81){
		quitprogram();
	}
	
	if(e.ctrlKey && e.which == 84){
		showpage('tutorials')
	}
	if(e.ctrlKey && e.which == 83){
		showMiniPage('donate');
	}
	if(e.ctrlKey && e.which == 66){
		showMiniPage('about');
	}
	if(e.ctrlKey && e.which == 68){
		ShowDebugWindow();
	}
	if(e.ctrlKey && e.which == 85){
		showpage('plugins');
	}
	if(e.ctrlKey && e.which == 82){
		reloadApp();
	}
	
	e.preventDefault;
});






//Open link in external browser
const shell = require('electron').shell;
// assuming $ is jQuery
$(document).on('click', 'a[href^="http"]', function(event) {
	event.preventDefault();
	shell.openExternal(this.href);
});


//Electron Bridge
ipcRenderer.on("setnewinfospotlocation", (event, arg)=>{
	currentprojectdata.panoramas[currentpanoramaindex].hotspots.push({ "hotspotid" : randomblah(10), "title" : arg.title, "position" : arg.position, "actions" : [], icon : "default.png" });
	updateWtmFile();
	//generateHTMLPanoramas();
	showeditorc("hotspots");
});


//Electron Bridge 2
ipcRenderer.on("updateinfospotlocation", (event, arg)=>{
	currentprojectdata.panoramas[currentpanoramaindex].hotspots[arg.title].position = arg.position;
	updateWtmFile();
	//generateHTMLPanoramas();
	showeditorc("hotspots");
});


//Overriding console.log
/*
var console = {};
console.error = function(msg){
	showAlert("Oh no... This is an Error!", "Select all the text below, press Ctrl+C on your keyboard to copy, and send it to habibieamrullah@gmail.com for fixing this error. Here is the error message:<br><br><br>" + msg);
};
console.log = function(msg){
	showAlert("Console Message", msg);
};
window.console = console;
*/








// file to url
//const path = require("path");
const { pathToFileURL } = require("url");


function toFileUrl(panofile) {
  // normalize dulu (biar \ di Windows jadi /)
  const normalizedPath = path.normalize(panofile);
  return pathToFileURL(normalizedPath).href;
}






//Scan for plugins and initialize
function ScanForPlugins(){
	
	console.log("Current app path: " + apppath);
	
	fs.readdir(apppath + "\\plugins", function (err, files) {
		//handling error
		if (err) {
			return console.log('Unable to scan directory: ' + err);
		} 
		//listing all files using forEach
		files.forEach(function (file) {
			var stats = fs.statSync(apppath + "\\plugins\\" + file);
			if(stats.isDirectory()){
				console.log("Plugin directory found: " + file);
				
				fs.readFile(apppath + "\\plugins\\" + file + "\\plugininfo.txt", 'utf8', function (err, data) {
					if(err){
						console.log("Plugin " + file + " is invalid");
						return;
					}
					
					var plugininfo = data.split("|");
					var status = plugininfo[6];
					var grayscale = "";
					
					var enabledisablebutton = "<button class='greenbutton' onclick=\"DisablePlugin('" +file+ "');\" style='margin: 0px;'><i class='fa fa-plug'></i> Disable Plugin</button>";
					if(status == "status-disabled"){
						enabledisablebutton = "<button onclick=\"EnablePlugin('" +file+ "');\" style='margin: 0px; background-color: gray;'><i class='fa fa-plug'></i> Enable Plugin</button>";
						grayscale = " filter: grayscale(100%);";
					}else{
						$("body").append("<script src='plugins/" +file+ "/" +file+ ".js'></script>");
						console.log("Plugin " + file + " is enabled.");
					}
					$("#pluginlist").append("<div class='pluginbar'><div style='display: table; width: 100%;" +grayscale+ "'><div style='display: table-cell; vertical-align: top; width: 80px;'><img src='plugins/" + file + "/thumbnail.png' style='width: 80px;'></div><div style='display: table-cell; vertical-align: top; padding-left: 1em;'><h2 style='margin: 0px;'>" + plugininfo[0] + "</h2><h5>Version " + plugininfo[1] +" | Requires 3Sixty Desktop Version " + plugininfo[2] + " | Developed by <a href='" + plugininfo[4] + "'>" + plugininfo[3] + "</a></h5><div>" +plugininfo[5]+ "</div></div></div><div style='text-align: right;'>" +enabledisablebutton+ "</div></div>");
				});
				
			}
		});
		
	});


	
}


//Enable Plugin
function EnablePlugin(p){
	fs.readFile(apppath + "\\plugins\\" + p + "\\plugininfo.txt", 'utf8', function (err, data) {
		if(err){
			console.log("Plugin " + p + " is invalid");
			return;
		}
		
		data = data.replace("status-disabled", "status-enabled");
		
		fs.writeFile(apppath + "\\plugins\\" + p + "\\plugininfo.txt", data, function (err) {
			if (err) return console.log(err);
			
			reloadApp();
		});
	});
}


//Disable Plugin
function DisablePlugin(p){
	fs.readFile(apppath + "\\plugins\\" + p + "\\plugininfo.txt", 'utf8', function (err, data) {
		if(err){
			console.log("Plugin " + p + " is invalid");
			return;
		}
		
		data = data.replace("status-enabled", "status-disabled");
		
		fs.writeFile(apppath + "\\plugins\\" + p + "\\plugininfo.txt", data, function (err) {
			if (err) return console.log(err);
			
			reloadApp();
		});
	});
}


//Reload Editor Hotspots
function ReloadEditorHotspots(){
	var panoswithhots = "";
	for(var i = 0; i < currentprojectdata.panoramas.length; i++){
		var hotspotsofit = "";
		if(currentprojectdata.panoramas[i].hotspots.length == 0){
			hotspotsofit = "<div>There is no hotspot for this panorama.</div>";
		}else{
			for(var x = 0 ; x < currentprojectdata.panoramas[i].hotspots.length; x++){
				var cid = currentprojectdata.panoramas[i].hotspots[x].hotspotid;
				var hotspoticon = "default.png";


				
				
				if(currentprojectdata.panoramas[i].hotspots[x].icon != undefined){
					if(currentprojectdata.panoramas[i].hotspots[x].icon != "")
						hotspoticon = "/" + currentprojectdata.panoramas[i].hotspots[x].icon;
				}
				
				var currenthActions = "<p>Actions:</p>";
				var currenthActions2 = "";
				var htarget = "";
				
				
				/*
				if(currentprojectdata.panoramas[i].hotspots[x].url != undefined || currentprojectdata.panoramas[i].hotspots[x].js != undefined){
					currenthActions = "<p>Actions:</p>";
				}
				*/
				
				
				
				var hactions = currentprojectdata.panoramas[i].hotspots[x].actions;
				if(hactions.length > 0){
					for(var y = 0; y < hactions.length; y++){
						var hatype;
						htarget = hactions[y].target;
						
						if(hactions[y].type == 0){
							hatype = "Open Panorama";
							htarget = hactions[y].target.split("/")[1];
						}else if(hactions[y].type == 1){
							hatype = "Show Image";
							htarget = hactions[y].target.split("/")[1];
						}else if(hactions[y].type == 2){
							hatype = "Play Video File";
							htarget = hactions[y].target.split("/")[1];
						}else if(hactions[y].type == 3){
							hatype = "Play Audio File";
							htarget = hactions[y].target.split("/")[1];
						}else if(hactions[y].type == 4){
							hatype = "Show PDF File";
							htarget = hactions[y].target.split("/")[1];
						}else if(hactions[y].type == 5){
							hatype = "Open 3D Scene";
							// Extract scene name from ID
							var sceneId = hactions[y].target.replace("3dscene:", "");
							var sceneName = "Unknown Scene";
							if (currentprojectdata.threedeescenes) {
								for(var s = 0; s < currentprojectdata.threedeescenes.length; s++){
									if(currentprojectdata.threedeescenes[s].id == sceneId){
										sceneName = currentprojectdata.threedeescenes[s].name;
										break;
									}
								}
							}
							htarget = sceneName;
						}
						
						currenthActions += "<div style='text-align: left;'><div style='font-style: italic; display: inline-block; background-color: black; color: white; padding: 5px; margin-top: 5px;'><i class='fa fa-arrow-circle-right'></i> "+hatype+"</div><div style='padding: 10px; border: 1px solid black;'><div><i class='fa fa-crosshairs'></i> " +htarget+ "</div><div style='color: gray; font-weight: bold; cursor: pointer; margin-top: 10px; display: inline-block;' onclick='removhaction("+y+", \""+cid+"\");'><i class='fa fa-trash'></i> Remove</div></div></div>";
					}
				}
				
				if(currentprojectdata.panoramas[i].hotspots[x].url != undefined && currentprojectdata.panoramas[i].hotspots[x].url != ""){
					hatype = "Open URL";
					htarget = currentprojectdata.panoramas[i].hotspots[x].url;
					currenthActions2 += "<div style='text-align: left;'><div style='font-style: italic; display: inline-block; background-color: black; color: white; padding: 5px; margin-top: 5px;'><i class='fa fa-arrow-circle-right'></i> "+hatype+"</div><div style='padding: 10px; border: 1px solid black;'><div><i class='fa fa-crosshairs'></i> " +htarget+ "</div><div style='color: gray; font-weight: bold; cursor: pointer; margin-top: 10px; display: inline-block;' onclick='removhurl(\""+cid+"\");'><i class='fa fa-trash'></i> Remove</div></div></div>";
				}
				
				if(currentprojectdata.panoramas[i].hotspots[x].js != undefined && currentprojectdata.panoramas[i].hotspots[x].js != ""){
					hatype = "Execute JavaScript";
					htarget = "<span style='font-style: italic;'>Your JS Code...</span>";
					currenthActions2 += "<div style='text-align: left;'><div style='font-style: italic; display: inline-block; background-color: black; color: white; padding: 5px; margin-top: 5px;'><i class='fa fa-arrow-circle-right'></i> "+hatype+"</div><div style='padding: 10px; border: 1px solid black;'><div><i class='fa fa-crosshairs'></i> " +htarget+ "</div><div style='color: gray; font-weight: bold; cursor: pointer; margin-top: 10px; display: inline-block;' onclick='removhjs(\""+cid+"\");'><i class='fa fa-trash'></i> Remove</div></div></div>";
				}
				
				var hiconidx = "default.png";
				if(currentprojectdata.panoramas[i].hotspots[x].icon != undefined)
					hiconidx = currentprojectdata.panoramas[i].hotspots[x].icon;
				
				var oriimagefile = wtmdata.projects[currentprojectindex].projectdir + '/images/' + hiconidx;
				var imagefileurl = toFileUrl(oriimagefile);
				


				hotspotsofit = "<div class='hotspotholder'><div class='hotspottitle'><input onkeyup=renameHotspotTitle("+i+","+x+") id='hinput"+cid+"' value='" +currentprojectdata.panoramas[i].hotspots[x].title+ "'></div><div style='padding: 10px; white-space: normal; display: block; box-sizing: border-box;'><div id='hotscreen"+cid+"' style='display: none;'></div><div id='hothome"+cid+"'><div onclick='changehotspoticon(\""+cid+"\");' style='width: 92px; height: 92px; margin: 0 auto; margin-top: 10px; margin-bottom: 10px; background: url("+ imagefileurl +") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'></div><div>"+currenthActions+currenthActions2+"</div></div></div><div align='right'><button style='min-width: 20px;' class='greenbutton' onclick='hotShowAddNewAction(\""+cid+"\")'><i class='fa fa-plus'></i> Action</button><button style='min-width: 20px;' onclick='reSetHotspotPosition("+i+","+x+")'><i class='fa fa-pencil'></i> Position</button><button class='redbutton' style='min-width: 20px;' onclick=removehotspot('"+cid+"');><i class='fa fa-trash'></i> Del.</button></div></div>" + hotspotsofit;
				
				// config button -> <button style='min-width: 20px;' onclick='hotShowConfigs(\""+cid+"\")'><i class='fa fa-cogs'></i> Conf.</button>
			}
		}
		
		hotspotsofit = "<div>" + hotspotsofit + "</div>";


		var panofile = wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + currentprojectdata.panoramas[i].panofile;
		var panoUrl = toFileUrl(panofile);
		
		panoswithhots += "<div style='background: url(" + panoUrl + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; margin-bottom: 20px; margin-right: 20px;'><div class='brighteronhover' style='padding: 20px;'><div style='border: 2px solid white; color: white; padding: 10px; display: inline-block; margin-bottom: 10px;'>" +currentprojectdata.panoramas[i].panofile+ "</div><div style='overflow: auto; white-space: nowrap;'>" + hotspotsofit + "</div><button style='margin: 0px; margin-top: 10px;' class='greenbutton' onclick=addNewHotspotFor("+i+")><i class='fa fa-plus-square'></i> Add New Hotspot</button></div></div>";
	}
	$("#editorcontent").html("<h2>Hotspots</h2>" + panoswithhots);
}



// =====================================================
// 3D SCENES FUNCTIONS
// =====================================================

// Show 3D Scenes editor
function showeditor3DScenes() {
    isOnTourmap = false;
    
    if (!currentprojectdata.threedeescenes) {
        currentprojectdata.threedeescenes = [];
    }
    
    var scenesHTML = "<h2>3D Scenes</h2>";
    
    if (currentprojectdata.threedeescenes.length === 0) {
        scenesHTML += "<p>You don't have any 3D scenes yet.</p>";
    } else {
        for (var i = 0; i < currentprojectdata.threedeescenes.length; i++) {
            var scene = currentprojectdata.threedeescenes[i];
            scenesHTML += `
                <div class="threedscene-item" style="background-color: #2c3643; margin-bottom: 15px; padding: 15px; border-radius: 5px;">
                    <div style="display: table; width: 100%;">
                        <div style="display: table-cell; vertical-align: middle;">
                            <strong style="font-size: 18px;">${scene.name}</strong>
                            <div style="font-size: 12px; color: #eba576;">${scene.objects ? scene.objects.length : 0} objects</div>
                        </div>
                        <div style="display: table-cell; vertical-align: middle; text-align: right;">
                            <button class="greenbutton" onclick="edit3DScene(${i})" style="margin-right: 5px;">
                                <i class="fa fa-pencil"></i> Edit
                            </button>
                            <button class="redbutton" onclick="delete3DScene(${i})">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="margin-top: 10px; font-size: 12px;">
                        <span style="background-color: #0d9e59; padding: 3px 8px; border-radius: 3px; margin-right: 5px;">
                            <i class="fa fa-cube"></i> Camera: (${scene.cameraPos ? scene.cameraPos.x : 0}, ${scene.cameraPos ? scene.cameraPos.y : 1.6}, ${scene.cameraPos ? scene.cameraPos.z : 5})
                        </span>
                    </div>
                </div>
            `;
        }
    }
    
    scenesHTML += `
        <div class="imgthumb" onclick="addNew3DScene()" style="height: 100px; width: 200px;">
            <div style="cursor: pointer; display: table; width: 100%; height: 100%;">
                <div style="display: table-cell; text-align: center; vertical-align: middle;">
                    <i class="fa fa-plus" style="font-size: 40px;"></i><br>
                    Add 3D Scene
                </div>
            </div>
        </div>
    `;
    
    $("#editorcontent").html(scenesHTML);
}

function addNew3DScene() {
    if (!currentprojectdata.threedeescenes) {
        currentprojectdata.threedeescenes = [];
    }
    
    // Tampilkan dialog custom untuk input nama
    $("#dimmessage").html(`
        <div style='width: 400px; margin: 0 auto; background-color: #2c3643; border-radius: 5px;'>
            <div style='background-color: #2c3643; color: white; padding: 10px; border-radius: 5px 5px 0 0;'>
                <i class='fa fa-cube'></i> New 3D Scene
            </div>
            <div style='padding: 30px; background-color: #3d4855; border-radius: 0 0 5px 5px;'>
                <p>Enter 3D Scene Name:</p>
                <input id='new3dscenename' type='text' value='My 3D Scene ${currentprojectdata.threedeescenes.length + 1}' 
                       style='width: 100%; margin-bottom: 20px; padding: 8px; box-sizing: border-box;'>
                <button onclick='createNew3DScene()' class='greenbutton' style='margin-right: 10px;'>
                    <i class='fa fa-check'></i> Create
                </button>
                <button onclick='hideDim()' style='margin-left: 10px;'>
                    <i class='fa fa-times'></i> Cancel
                </button>
            </div>
        </div>
    `);
    
    $("#dim").show();
    $("#loading").hide();
    
    // Focus otomatis ke input
    setTimeout(function() {
        $("#new3dscenename").focus();
    }, 100);
}

function createNew3DScene() {
    var sceneName = $("#new3dscenename").val().trim();
    if (!sceneName) {
        sceneName = "My 3D Scene " + (currentprojectdata.threedeescenes.length + 1);
    }
    
    // Create default scene with plane and cube - dengan rotasi yang benar
    var newScene = {
        id: "3dscene_" + randomblah(8),
        name: sceneName,
        cameraPos: { x: 0, y: 1.6, z: 5 },
        objects: [
            {
                id: 'obj_' + Date.now() + '_plane',
                type: "plane",
                width: 50,
                height: 50,
                color: 0xffffff,
                posX: 0,
                posY: 0,
                posZ: 0,
                rotX: -90, // Rotasi -90 derajat di sumbu X untuk floor
                rotY: 0,
                rotZ: 0,
                scaleX: 1,
                scaleY: 1,
                scaleZ: 1
            },
            {
                id: 'obj_' + Date.now() + '_cube',
                type: "cube",
                width: 1,
                height: 1,
                depth: 1,
                color: 0x00ff00,
                posX: 0,
                posY: 0.5,
                posZ: 0,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                scaleX: 1,
                scaleY: 1,
                scaleZ: 1
            }
        ]
    };
    
    currentprojectdata.threedeescenes.push(newScene);
    updateWtmFile();
    hideDim();
    showeditor3DScenes();
}

// Edit 3D scene
function edit3DScene(index) {
    var scene = currentprojectdata.threedeescenes[index];
    
    var editHTML = `
        <h2>Edit 3D Scene: ${scene.name}</h2>
        
        <div style="margin-bottom: 20px;">
            <h3>Scene Settings</h3>
            <div style="display: table; width: 100%;">
                <div style="display: table-cell; padding-right: 10px;">
                    <p>Scene Name:</p>
                    <input id="editscene_name" value="${scene.name}" style="width: 100%;">
                </div>
                <div style="display: table-cell;">
                    <p>Scene ID:</p>
                    <input value="${scene.id}" readonly style="width: 100%; background-color: #3d4855;">
                </div>
            </div>
            
            <h4 style="margin-top: 15px;">Camera Position</h4>
            <div style="display: table; width: 100%;">
                <div style="display: table-cell; padding-right: 10px;">
                    <p>X:</p>
                    <input id="editscene_camx" type="number" step="0.1" value="${scene.cameraPos ? scene.cameraPos.x : 0}" style="width: 100%;">
                </div>
                <div style="display: table-cell; padding-right: 10px;">
                    <p>Y:</p>
                    <input id="editscene_camy" type="number" step="0.1" value="${scene.cameraPos ? scene.cameraPos.y : 1.6}" style="width: 100%;">
                </div>
                <div style="display: table-cell;">
                    <p>Z:</p>
                    <input id="editscene_camz" type="number" step="0.1" value="${scene.cameraPos ? scene.cameraPos.z : 5}" style="width: 100%;">
                </div>
            </div>
        </div>
        
        <h3>Objects <button class="greenbutton" onclick="addObjectToScene(${index})" style="margin-left: 10px;"><i class="fa fa-plus"></i> Add Object</button></h3>
        <div id="scene_objects_list">
    `;
    
    if (scene.objects && scene.objects.length > 0) {
        for (var i = 0; i < scene.objects.length; i++) {
            var obj = scene.objects[i];
            editHTML += `
                <div class="threedscene-object" style="background-color: #3d4855; margin-bottom: 10px; padding: 10px; border-radius: 3px;">
                    <div style="display: table; width: 100%;">
                        <div style="display: table-cell; vertical-align: middle;">
                            <strong>${obj.type}</strong> 
                            <span style="color: #eba576; margin-left: 10px;">
                                Color: #${obj.color ? obj.color.toString(16).padStart(6, '0') : '00ff00'}
                            </span>
                        </div>
                        <div style="display: table-cell; vertical-align: middle; text-align: right;">
                            <button class="greenbutton" onclick="editObjectInScene(${index}, ${i})" style="margin-right: 5px;">
                                <i class="fa fa-pencil"></i>
                            </button>
                            <button class="redbutton" onclick="removeObjectFromScene(${index}, ${i})">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="margin-top: 5px; font-size: 12px;">
                        Position: (${obj.posX}, ${obj.posY}, ${obj.posZ})
                    </div>
                </div>
            `;
        }
    } else {
        editHTML += "<p>No objects in this scene.</p>";
    }
    
    editHTML += `
        </div>
        
        <div style="margin-top: 20px;">
            <button class="greenbutton" onclick="save3DScene(${index})">
                <i class="fa fa-floppy-o"></i> Save Changes
            </button>
            <button onclick="showeditor3DScenes()" style="margin-left: 10px;">
                <i class="fa fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    $("#editorcontent").html(editHTML);
}

// Add object to scene
function addObjectToScene(sceneIndex) {
    var objectTypes = [
        { value: "cube", label: "Cube" },
        { value: "sphere", label: "Sphere" },
        { value: "plane", label: "Plane" }
    ];
    
    var typeOptions = "";
    for (var i = 0; i < objectTypes.length; i++) {
        typeOptions += `<option value="${objectTypes[i].value}">${objectTypes[i].label}</option>`;
    }
    
    var addHTML = `
        <h3>Add New Object</h3>
        <div style="margin-bottom: 15px;">
            <p>Object Type:</p>
            <select id="newobject_type">
                ${typeOptions}
            </select>
        </div>
        
        <div id="newobject_properties">
            <!-- Dynamic properties will be loaded here -->
        </div>
        
        <h4>Position</h4>
        <div style="display: table; width: 100%; margin-bottom: 15px;">
            <div style="display: table-cell; padding-right: 10px;">
                <p>X:</p>
                <input id="newobject_x" type="number" step="0.1" value="0">
            </div>
            <div style="display: table-cell; padding-right: 10px;">
                <p>Y:</p>
                <input id="newobject_y" type="number" step="0.1" value="0">
            </div>
            <div style="display: table-cell;">
                <p>Z:</p>
                <input id="newobject_z" type="number" step="0.1" value="0">
            </div>
        </div>
        
        <button class="greenbutton" onclick="addObjectToSceneConfirm(${sceneIndex})">
            <i class="fa fa-plus"></i> Add Object
        </button>
        <button onclick="edit3DScene(${sceneIndex})" style="margin-left: 10px;">
            <i class="fa fa-times"></i> Cancel
        </button>
    `;
    
    $("#editorcontent").html(addHTML);
    
    // Load default properties for selected type
    updateObjectProperties();
    
    $("#newobject_type").change(function() {
        updateObjectProperties();
    });
}

function updateObjectProperties() {
    var type = $("#newobject_type").val();
    var propsHTML = "";
    
    switch(type) {
        case "cube":
            propsHTML = `
                <h4>Cube Properties</h4>
                <div style="display: table; width: 100%;">
                    <div style="display: table-cell; padding-right: 10px;">
                        <p>Width:</p>
                        <input id="newobject_width" type="number" step="0.1" value="1">
                    </div>
                    <div style="display: table-cell; padding-right: 10px;">
                        <p>Height:</p>
                        <input id="newobject_height" type="number" step="0.1" value="1">
                    </div>
                    <div style="display: table-cell;">
                        <p>Depth:</p>
                        <input id="newobject_depth" type="number" step="0.1" value="1">
                    </div>
                </div>
                <p>Color (hex):</p>
                <input id="newobject_color" type="text" value="00ff00">
            `;
            break;
            
        case "sphere":
            propsHTML = `
                <h4>Sphere Properties</h4>
                <p>Radius:</p>
                <input id="newobject_radius" type="number" step="0.1" value="0.7">
                <p>Color (hex):</p>
                <input id="newobject_color" type="text" value="0099ff">
            `;
            break;
            
        case "plane":
            propsHTML = `
                <h4>Plane Properties</h4>
                <div style="display: table; width: 100%;">
                    <div style="display: table-cell; padding-right: 10px;">
                        <p>Width:</p>
                        <input id="newobject_width" type="number" step="0.1" value="50">
                    </div>
                    <div style="display: table-cell;">
                        <p>Height:</p>
                        <input id="newobject_height" type="number" step="0.1" value="50">
                    </div>
                </div>
                <p>Color (hex):</p>
                <input id="newobject_color" type="text" value="ffffff">
            `;
            break;
    }
    
    $("#newobject_properties").html(propsHTML);
}

function addObjectToSceneConfirm(sceneIndex) {
    var type = $("#newobject_type").val();
    var newObj = {
        id: 'obj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), // TAMBAHKAN ID
        type: type,
        posX: parseFloat($("#newobject_x").val()) || 0,
        posY: parseFloat($("#newobject_y").val()) || 0,
        posZ: parseFloat($("#newobject_z").val()) || 0,
        rotX: 0, // TAMBAHKAN ROTASI DEFAULT
        rotY: 0,
        rotZ: 0,
        scaleX: 1, // TAMBAHKAN SCALE DEFAULT
        scaleY: 1,
        scaleZ: 1
    };
    
    // Parse color
    var colorStr = $("#newobject_color").val().replace("#", "");
    newObj.color = parseInt(colorStr, 16) || 0xffffff;
    
    switch(type) {
        case "cube":
            newObj.width = parseFloat($("#newobject_width").val()) || 1;
            newObj.height = parseFloat($("#newobject_height").val()) || 1;
            newObj.depth = parseFloat($("#newobject_depth").val()) || 1;
            break;
            
        case "sphere":
            newObj.radius = parseFloat($("#newobject_radius").val()) || 0.7;
            break;
            
        case "plane":
            newObj.width = parseFloat($("#newobject_width").val()) || 50;
            newObj.height = parseFloat($("#newobject_height").val()) || 50;
            break;
    }
    
    if (!currentprojectdata.threedeescenes[sceneIndex].objects) {
        currentprojectdata.threedeescenes[sceneIndex].objects = [];
    }
    
    currentprojectdata.threedeescenes[sceneIndex].objects.push(newObj);
    updateWtmFile();
    edit3DScene(sceneIndex);
}

function editObjectInScene(sceneIndex, objIndex) {
    var scene = currentprojectdata.threedeescenes[sceneIndex];
    var obj = scene.objects[objIndex];
    
    var typeOptions = `
        <option value="cube" ${obj.type === 'cube' ? 'selected' : ''}>Cube</option>
        <option value="sphere" ${obj.type === 'sphere' ? 'selected' : ''}>Sphere</option>
        <option value="plane" ${obj.type === 'plane' ? 'selected' : ''}>Plane</option>
    `;
    
    var propsHTML = "";
    var colorHex = obj.color ? obj.color.toString(16).padStart(6, '0') : '00ff00';
    
    switch(obj.type) {
        case "cube":
            propsHTML = `
                <h4>Cube Properties</h4>
                <div style="display: table; width: 100%;">
                    <div style="display: table-cell; padding-right: 10px;">
                        <p>Width:</p>
                        <input id="editobject_width" type="number" step="0.1" value="${obj.width || 1}">
                    </div>
                    <div style="display: table-cell; padding-right: 10px;">
                        <p>Height:</p>
                        <input id="editobject_height" type="number" step="0.1" value="${obj.height || 1}">
                    </div>
                    <div style="display: table-cell;">
                        <p>Depth:</p>
                        <input id="editobject_depth" type="number" step="0.1" value="${obj.depth || 1}">
                    </div>
                </div>
                <p>Color (hex):</p>
                <input id="editobject_color" type="text" value="${colorHex}">
            `;
            break;
            
        case "sphere":
            propsHTML = `
                <h4>Sphere Properties</h4>
                <p>Radius:</p>
                <input id="editobject_radius" type="number" step="0.1" value="${obj.radius || 0.7}">
                <p>Color (hex):</p>
                <input id="editobject_color" type="text" value="${colorHex}">
            `;
            break;
            
        case "plane":
            propsHTML = `
                <h4>Plane Properties</h4>
                <div style="display: table; width: 100%;">
                    <div style="display: table-cell; padding-right: 10px;">
                        <p>Width:</p>
                        <input id="editobject_width" type="number" step="0.1" value="${obj.width || 50}">
                    </div>
                    <div style="display: table-cell;">
                        <p>Height:</p>
                        <input id="editobject_height" type="number" step="0.1" value="${obj.height || 50}">
                    </div>
                </div>
                <p>Color (hex):</p>
                <input id="editobject_color" type="text" value="${colorHex}">
            `;
            break;
    }
    
    var editHTML = `
        <h3>Edit Object</h3>
        <div style="margin-bottom: 15px;">
            <p>Object Type:</p>
            <select id="editobject_type">
                ${typeOptions}
            </select>
        </div>
        
        <div id="editobject_properties">
            ${propsHTML}
        </div>
        
        <h4>Position</h4>
        <div style="display: table; width: 100%; margin-bottom: 15px;">
            <div style="display: table-cell; padding-right: 10px;">
                <p>X:</p>
                <input id="editobject_x" type="number" step="0.1" value="${obj.posX || 0}">
            </div>
            <div style="display: table-cell; padding-right: 10px;">
                <p>Y:</p>
                <input id="editobject_y" type="number" step="0.1" value="${obj.posY || 0}">
            </div>
            <div style="display: table-cell;">
                <p>Z:</p>
                <input id="editobject_z" type="number" step="0.1" value="${obj.posZ || 0}">
            </div>
        </div>
        
        <button class="greenbutton" onclick="saveObjectChanges(${sceneIndex}, ${objIndex})">
            <i class="fa fa-floppy-o"></i> Save Changes
        </button>
        <button onclick="edit3DScene(${sceneIndex})" style="margin-left: 10px;">
            <i class="fa fa-times"></i> Cancel
        </button>
    `;
    
    $("#editorcontent").html(editHTML);
}

function saveObjectChanges(sceneIndex, objIndex) {
    var obj = currentprojectdata.threedeescenes[sceneIndex].objects[objIndex];
    
    // Update position
    obj.posX = parseFloat($("#editobject_x").val()) || 0;
    obj.posY = parseFloat($("#editobject_y").val()) || 0;
    obj.posZ = parseFloat($("#editobject_z").val()) || 0;
    
    // Update color
    var colorStr = $("#editobject_color").val().replace("#", "");
    obj.color = parseInt(colorStr, 16) || 0xffffff;
    
    // Update type-specific properties
    switch(obj.type) {
        case "cube":
            obj.width = parseFloat($("#editobject_width").val()) || 1;
            obj.height = parseFloat($("#editobject_height").val()) || 1;
            obj.depth = parseFloat($("#editobject_depth").val()) || 1;
            break;
            
        case "sphere":
            obj.radius = parseFloat($("#editobject_radius").val()) || 0.7;
            break;
            
        case "plane":
            obj.width = parseFloat($("#editobject_width").val()) || 50;
            obj.height = parseFloat($("#editobject_height").val()) || 50;
            break;
    }
    
    updateWtmFile();
    edit3DScene(sceneIndex);
}

function removeObjectFromScene(sceneIndex, objIndex) {
    showYesNoAlert("Remove Object", "Are you sure you want to remove this object?", function() {
        currentprojectdata.threedeescenes[sceneIndex].objects.splice(objIndex, 1);
        updateWtmFile();
        edit3DScene(sceneIndex);
    });
}

function delete3DScene(index) {
    showYesNoAlert("Delete 3D Scene", "Are you sure you want to delete this 3D scene?", function() {
        currentprojectdata.threedeescenes.splice(index, 1);
        updateWtmFile();
        showeditor3DScenes();
    });
}

function save3DScene(index) {
    var scene = currentprojectdata.threedeescenes[index];
    
    // Update scene properties
    scene.name = $("#editscene_name").val();
    scene.cameraPos = {
        x: parseFloat($("#editscene_camx").val()) || 0,
        y: parseFloat($("#editscene_camy").val()) || 1.6,
        z: parseFloat($("#editscene_camz").val()) || 5
    };
    
    updateWtmFile();
    showeditor3DScenes();
}




// Tambahkan fungsi ini di app.js setelah fungsi edit3DScene yang sudah ada

// Open 3D Scene Visual Editor
function open3DSceneVisualEditor(sceneIndex) {
    var scene = currentprojectdata.threedeescenes[sceneIndex];
    
    // Buat file HTML temporary untuk 3D editor
    var editorPath = __dirname + "/threededitor.html";
    
    // Data scene untuk dikirim ke editor
    var sceneData = {
        index: sceneIndex,
        projectDir: wtmdata.projects[currentprojectindex].projectdir,
        scene: scene
    };
    
    // Tulis data scene ke file temp
    var tempDataFile = __dirname + "/temp/scenedata_" + scene.id + ".json";
    fse.ensureDirSync(__dirname + "/temp");
    fs.writeFileSync(tempDataFile, JSON.stringify(sceneData));
    
    // Buat editor window
    var editorWindow = new BrowserWindow({
        width: 1366,
        height: 768,
        title: "3D Scene Editor - " + scene.name,
        icon: "3Sixty.ico",
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true,
            enableRemoteModule: true,
            webSecurity: false
        }
    });
    
    // Load editor HTML
    editorWindow.loadFile(editorPath);
    editorWindow.removeMenu();
    editorWindow.webContents.openDevTools(); // Uncomment untuk debugging
    
    // Listen untuk ketika editor ditutup
    editorWindow.on('closed', function() {
        // Baca ulang data scene setelah editor ditutup
        try {
            var updatedData = fs.readFileSync(tempDataFile, 'utf8');
            var updatedScene = JSON.parse(updatedData);
            currentprojectdata.threedeescenes[sceneIndex] = updatedScene.scene;
            updateWtmFile();
            
            // Hapus file temp
            fs.unlinkSync(tempDataFile);
        } catch(e) {
            console.log("Error reading updated scene data:", e);
        }
    });
}

// Override fungsi edit3DScene yang sudah ada
function edit3DScene(index) {
    // Ganti dengan visual editor
    open3DSceneVisualEditor(index);
}