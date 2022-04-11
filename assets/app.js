var wtmdata = {
	projects : [],
};

if(localStorage.getItem("wtmdata") === null){
	saveWtmdata();
}else{
	loadWtmdata();
}

function saveWtmdata(){
	localStorage.setItem("wtmdata", JSON.stringify(wtmdata));
}

function loadWtmdata(){
	wtmdata = JSON.parse(localStorage.getItem("wtmdata"));
}

function reloadApp(){
	location.reload();
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

function showInExplorer(idx){
	
	var dir = wtmdata.projects[idx].projectdir;
	
	if(dir.indexOf(" ") > -1){
		showAlert("White Space Problem", "This project folder contains white space(s). Please manually explore and find it on your computer:<br>" + dir);
	}else{
		console.log("Trying to open in dir: " + dir);
		require('child_process').exec('start "" ' + dir);
	}
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
		var newwin = new BrowserWindow({ width: 1280, height : 720, title : "Project Preview", icon: "3Sixty.ico", });
		newwin.loadFile(ppath);
		newwin.removeMenu();
		//newwin.webContents.openDevTools();
		hideDim();
	}, 2000);
}

function generatePanoramas(arr){
	var pdata = "";
	if(arr.length > 0){
		for(var i = 0; i < arr.length; i++){
			var panovar = arr[i].panofile.split(".")[0];
			pdata += "var "+panovar+" = new PANOLENS.ImagePanorama( \"panoramas/" + arr[i].panofile + "\" );\n\
			"+panovar+".addEventListener('progress', function(e){\n\
				$(\"#loading\").show();\n\
			});\n\
			"+panovar+".addEventListener('load', function(e){\n\
				$(\"#loading\").fadeOut();\n\
			});\n\
			"+panovar+".addEventListener('click', function(e){\n\
			});\n\r\n\r";
			
			for( var x = 0; x < arr[i].hotspots.length; x++){
				
				var hicon = 0;
				if(arr[i].hotspots[x].icon != undefined){
					hicon = arr[i].hotspots[x].icon;
				}
				
				pdata += "var infospot"+panovar+x+" = new PANOLENS.Infospot( 512, hotspotIcons["+hicon+"].data, true );\n\
				infospot"+panovar+x+".position.set( "+arr[i].hotspots[x].position+" );\n\
				"+panovar+".add(infospot"+panovar+x+");\n\r";
				
				//Does it have hover text?
				if(arr[i].hotspots[x].stoh != undefined && arr[i].hotspots[x].stoh == 1){
					pdata += "infospot"+panovar+x+".addHoverText( '"+arr[i].hotspots[x].title+"' );\n\r";
				}
				
				pdata += "infospot"+panovar+x+".addEventListener('click', function(){\n\r";
				//Lets check if the infospot has actions in it
				if(arr[i].hotspots[x].actions.length > 0){
					var cactions = arr[i].hotspots[x].actions;
					for(var y = 0; y < cactions.length; y++){
						//If it is opening another Panorama
						var actiontype = cactions[y].type;
						if(actiontype == 0){
							var targetpanorama = cactions[y].target.split(".")[0];
							targetpanorama = targetpanorama.split("/")[1];
							pdata += "viewer.setPanorama( "+targetpanorama+" );\n\r";
						}else{
							pdata += "showMedia("+actiontype+", '"+cactions[y].target+"');\n\r";
						}
					}
					
				}
				if(arr[i].hotspots[x].url != undefined && arr[i].hotspots[x].url != ""){
					pdata += "window.open( '"+arr[i].hotspots[x].url+"', '_blank');\n\r";
				}
				if(arr[i].hotspots[x].js != undefined && arr[i].hotspots[x].js != ""){
					pdata += arr[i].hotspots[x].js + "\n\r";
				}
				pdata += "});\n\r";
				
			}
			
			
			//Adding the infospot to the stage
			pdata += "viewer.add( "+panovar+" );\n\r";
			console.log("JS Code for this panorama has been added: " + panovar);
		}
		
		pdata += "$(document).ready(function(){ viewer.setPanorama( "+currentprojectdata.settings.firstpanorama.split(".")[0]+" ); });\n";
		
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
				if(ext == "jpg" || ext == "jpeg" || ext == "png")
					return true;
			}else if(dir == "panoramas"){
				if(ext == "jpg" || ext == "jpeg" || ext == "png")
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
			if( ext == "jpg" || ext == "jpeg" || ext == "png" ){
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

	var itemstochoose = "";
	
	for(var i = 0; i < hotspotIcons.length; i++){
		itemstochoose += "<div onclick='setHotspotIcon(\""+cid+"\", "+i+")' style='display: inline-block; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer;'><div><img src='" +hotspotIcons[i].data+ "' style='height: 96px;'></div><div style='font-size: 10px;'>" + hotspotIcons[i].name + "</div></div>";
	}
	
	$("#dimmessage").html("").html("<div style='width: 100%; max-width: 720px; height: 100%; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-question-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div style='box-sizing: border-box; width: 100%; height: "+(innerHeight-400)+"px; overflow: auto;'>"+itemstochoose+"</div><button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
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
			showAlert("About", "<h1>3Sixty Web Tour Maker</h1><h3>Version 1.1.0</h3><p>Made with:</p><div style='background-color: white;'><img src='imgs/poweredby.png' style='width: 100%;'></div><p style='margin-top: 20px;'>Developed by</p><a href='https://webappdev.id/'><img src='imgs/webappdev.png' style='width: 100%'></a><p><a href='#' onclick=showMiniPage('donate')>Support The Development</a><br><a href='https://3sixty.webappdev.my.id/'>Visit 3Sixty Website</a></p>");
			break;
		case "donate" :
			showAlert("Support The Development", "<p><img src='imgs/paypal.png' style='background-color: white; padding: 20px;'></p><p>This software is made for you for free. However, I expect any amount donations from users like you to keep me supported for maintenance and further development of this software.</p><p>Please send your donation to my PayPal account here: <a href='https://paypal.me/habibieamrullah'>https://paypal.me/habibieamrullah</a></p>");
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
	$("#currentprojectrunbutton").attr({ "onclick" : "previewProject("+idx+")" });
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

function showeditorc(type){
	switch(type){
		case "panoramas" :
			var panoramas = "<h2>Panorama Images</h2>";
			for(var i = 0; i < currentprojectdata.panoramas.length; i++){
				var itsmainpano = "";
				var itsmainpanogreen = "background-color: #eba576; color: black;";
				var itsmainpanoaction = " onclick='setitasmainpano(" +i+ ")'";
				var itsmainpanotrash = "";
				if(currentprojectdata.panoramas[i].panofile == currentprojectdata.settings.firstpanorama){
					itsmainpano = "<i class='fa fa-home'></i> ";
					itsmainpanogreen = "background-color: #0d9e59; color: white;";
					itsmainpanoaction = " onclick='showAlert(\"Main Panorama\", \"This panorama is already set as Main Panorama\");'";
					itsmainpanotrash = " display: none;";
				}
				panoramas += "<div class='imgthumb' style='position: relative; background: url(" + wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + currentprojectdata.panoramas[i].panofile + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'><span"+itsmainpanoaction+" style='"+itsmainpanogreen+" cursor: pointer; font-weight: bold; padding: 5px; font-size: 10px;'>" + itsmainpano + truncate(currentprojectdata.panoramas[i].panofile, 15) + "</span><div style='position: absolute; bottom: 0; right: 0;'><div onclick=\"showImage('"+currentprojectdata.panoramas[i].panofile+"', '" + wtmdata.projects[currentprojectindex].projectdir+"/panoramas/"+currentprojectdata.panoramas[i].panofile + "');\" class='greenbutton'><i class='fa fa-eye'></i></div><div onclick='removePanorama(" +i+ ")' class='redbutton' style='" +itsmainpanotrash+ "'><i class='fa fa-trash'></i></div></div></div>";
			}
			$("#editorcontent").html(panoramas + "<div class='imgthumb' onclick='addpanorama()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 40px;'></i></div></div></div>");
			break;
		case "settings" :
			var cbsetting = "";
			if(currentprojectdata.settings.controls == 1)
				cbsetting = " selected";
			$("#editorcontent").html("<h2>Project Settings</h2><div style='display: table; width: 100%; table-layout: fixed;'><div style='display: table-cell; vertical-align: top; padding-right: 10px;'><p>Project Description</p><input placeholder='Short description' id='psdescription' value='" +currentprojectdata.settings.description+ "'><p>Panorama Loading Text</p><input id='psloadingtext' placeholder='Loading text' value='" +currentprojectdata.settings.loadingtext+ "'></div><div style='display: table-cell; vertical-align: top;'><p>Main Panorama (First panorama to load)</p><select id='firstpanorama'>" +getPanoramasNameOption()+ "</select><p>Show Panolens Control Buttons (bottom right)</p><select id='pscontrols'><option value=0>No</option><option value=1"+cbsetting+">Yes</option></select></div></div><button onclick='saveProjectSettings()'><i class='fa fa-floppy-o'></i> Save</button>");
			//<p>Default Tour Mode</p><select><option>Normal</option><option>Cardboard</option><option>Stereoscopic</option></select>
			break;
		case "hotspots" :
			var panoswithhots = "";
			for(var i = 0; i < currentprojectdata.panoramas.length; i++){
				var hotspotsofit = "";
				if(currentprojectdata.panoramas[i].hotspots.length == 0){
					hotspotsofit = "<div>There is no hotspot for this panorama.</div>";
				}else{
					for(var x = 0 ; x < currentprojectdata.panoramas[i].hotspots.length; x++){
						var cid = currentprojectdata.panoramas[i].hotspots[x].hotspotid;
						var hotspoticon = "/imgs/hotspot.png";
						
						if(currentprojectdata.panoramas[i].hotspots[x].icon != undefined){
							if(currentprojectdata.panoramas[i].hotspots[x].icon != "")
								hotspoticon = "/" + currentprojectdata.panoramas[i].hotspots[x].icon;
						}
						
						var currenthActions = "<p>This Hotspot has no action yet. Click Plus button to add an action to it.</p>";
						
						if(currentprojectdata.panoramas[i].hotspots[x].url != undefined && currentprojectdata.panoramas[i].hotspots[x].js != undefined){
							currenthActions = "";
						}
						
						if(currentprojectdata.panoramas[i].hotspots[x].url != undefined && currentprojectdata.panoramas[i].hotspots[x].url != ""){
							hatype = "Open URL";
							htarget = currentprojectdata.panoramas[i].hotspots[x].url;
							currenthActions += "<div style='text-align: left;'><div style='font-style: italic; display: inline-block; background-color: black; color: white; padding: 5px; margin-top: 5px;'><i class='fa fa-arrow-circle-right'></i> "+hatype+"</div><div style='padding: 10px; border: 1px solid black;'><div><i class='fa fa-crosshairs'></i> " +htarget+ "</div><div style='color: gray; font-weight: bold; cursor: pointer; margin-top: 10px; display: inline-block;' onclick='removhurl(\""+cid+"\");'><i class='fa fa-trash'></i> Remove</div></div></div>";
						}
						
						if(currentprojectdata.panoramas[i].hotspots[x].js != undefined && currentprojectdata.panoramas[i].hotspots[x].js != ""){
							hatype = "Execute JavaScript";
							htarget = "<span style='font-style: italic;'>Your JS Code...</span>";
							currenthActions += "<div style='text-align: left;'><div style='font-style: italic; display: inline-block; background-color: black; color: white; padding: 5px; margin-top: 5px;'><i class='fa fa-arrow-circle-right'></i> "+hatype+"</div><div style='padding: 10px; border: 1px solid black;'><div><i class='fa fa-crosshairs'></i> " +htarget+ "</div><div style='color: gray; font-weight: bold; cursor: pointer; margin-top: 10px; display: inline-block;' onclick='removhjs(\""+cid+"\");'><i class='fa fa-trash'></i> Remove</div></div></div>";
						}
						
						var hactions = currentprojectdata.panoramas[i].hotspots[x].actions;
						if(hactions.length > 0){
							currenthActions = "<p>Actions:</p>";
							for(var y = 0; y < hactions.length; y++){
								var hatype;
								var htarget = hactions[y].target.split("/")[1];
								
								if(hactions[y].type == 0){
									hatype = "Open Panorama";
								}else if(hactions[y].type == 1){
									hatype = "Show Image";
								}else if(hactions[y].type == 2){
									hatype = "Play Video File";
								}else if(hactions[y].type == 3){
									hatype = "Play Audio File";
								}else if(hactions[y].type == 4){
									hatype = "Show PDF File";
								}
								
								currenthActions += "<div style='text-align: left;'><div style='font-style: italic; display: inline-block; background-color: black; color: white; padding: 5px; margin-top: 5px;'><i class='fa fa-arrow-circle-right'></i> "+hatype+"</div><div style='padding: 10px; border: 1px solid black;'><div><i class='fa fa-crosshairs'></i> " +htarget+ "</div><div style='color: gray; font-weight: bold; cursor: pointer; margin-top: 10px; display: inline-block;' onclick='removhaction("+y+", \""+cid+"\");'><i class='fa fa-trash'></i> Remove</div></div></div>";
							}
						}
						
						var hiconidx = 0;
						if(currentprojectdata.panoramas[i].hotspots[x].icon != undefined)
							hiconidx = currentprojectdata.panoramas[i].hotspots[x].icon;
						
						hotspotsofit = "<div class='hotspotholder'><div class='hotspottitle'><input onkeyup=renameHotspotTitle("+i+","+x+") id='hinput"+cid+"' value='" +currentprojectdata.panoramas[i].hotspots[x].title+ "'></div><div style='padding: 10px; white-space: normal; display: block; box-sizing: border-box;'><div id='hotscreen"+cid+"' style='display: none;'></div><div id='hothome"+cid+"'><div onclick='changehotspoticon(\""+cid+"\");' style='width: 92px; height: 92px; margin: 0 auto; margin-top: 10px; margin-bottom: 10px; background: url("+hotspotIcons[hiconidx].data+") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'></div><div>"+currenthActions+"</div></div></div><div align='right'><button style='min-width: 20px;' class='greenbutton' onclick='hotShowAddNewAction(\""+cid+"\")'><i class='fa fa-plus'></i> Action</button><button class='redbutton' style='min-width: 20px;' onclick=removehotspot('"+cid+"');><i class='fa fa-trash'></i> Del.</button></div></div>" + hotspotsofit;
						
						// config button -> <button style='min-width: 20px;' onclick='hotShowConfigs(\""+cid+"\")'><i class='fa fa-cogs'></i> Conf.</button>
					}
				}
				
				hotspotsofit = "<div>" + hotspotsofit + "</div>";
				
				panoswithhots += "<div style='background: url(" + wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + currentprojectdata.panoramas[i].panofile + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; margin-bottom: 20px; margin-right: 20px;'><div class='brighteronhover' style='padding: 20px;'><div style='border: 2px solid white; color: white; padding: 10px; display: inline-block; margin-bottom: 10px;'>" +currentprojectdata.panoramas[i].panofile+ "</div><div style='overflow: auto; white-space: nowrap;'>" + hotspotsofit + "</div><button style='margin: 0px; margin-top: 10px;' class='greenbutton' onclick=addNewHotspotFor("+i+")><i class='fa fa-plus-square'></i> Add New Hotspot</button></div></div>";
			}
			$("#editorcontent").html("<h2>Hotspots</h2>" + panoswithhots);
			
			break;
			
		case "imageassets" :
			var imagefiles = "";
			var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/images/";
			if (!fs.existsSync(workingdir)){
				fs.mkdirSync(workingdir);
			}
			fs.readdirSync(workingdir).forEach(file =>{
				if(file.split(".")[file.split(".").length-1] == "jpg" || file.split(".")[file.split(".").length-1] == "jpeg" || file.split(".")[file.split(".").length-1] == "png"){
					imagefiles += "<div class='imgthumb' style='position: relative; background: url(" + wtmdata.projects[currentprojectindex].projectdir+"/images/"+file + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'><span style='background-color: black; color: white; font-weight: bold; padding: 5px; font-size: 10px;'>" + truncate(file, 20) + "</span><div style='position: absolute; bottom: 0; right: 0;'><div onclick=\"showImage('"+file+"', '" + wtmdata.projects[currentprojectindex].projectdir+"/images/"+file + "');\" class='greenbutton'><i class='fa fa-eye'></i></div><div onclick=removeImageasset('"+wtmdata.projects[currentprojectindex].projectdir+"/images/"+file+"') class='redbutton'><i class='fa fa-trash'></i></div></div></div>";
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
	$("#hotscreen"+cid).hide().html("<div><h4>Select Action</h4></div><select id='haction"+cid+"' onchange=showactioncontent('"+cid+"')><option>Choose one...</option><option value=1>Open Panorama</option><option value=2>Show Image</option><option value=3>Play a Video</option><option value=4>Play an Audio</option><option value=5>Open a PDF file</option><option value=6>Open URL</option><option value=7>Execute JavaScript code</option></select><div id='hotactioncontent"+cid+"'></div><div class='button' onclick=showeditorc('hotspots') style='margin: 5px;'><i class='fa fa-floppy-o'></i> Save</div><div class='button' onclick=hotGoHome(\""+cid+"\") style='margin: 5px;'><i class='fa fa-times'></i> Close</div>").show();
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
	}
	$("#hotactioncontent"+cid).html(acontent);
}

//Show configs panel
function hotShowConfigs(cid){
	var projectdir = wtmdata.projects[currentprojectindex].projectdir;
	var hotspoticon = "/imgs/hotspot.png";
	var res = isCidMatched(cid);
	var currenthotspot = currentprojectdata.panoramas[res.pano].hotspots[res.hot];
	if(currenthotspot.icon != undefined && currenthotspot.icon != ""){
		hotspoticon = "/" + currenthotspot.icon;
	}
	var hotspotfilename = hotspoticon.split("/")[hotspoticon.split("/").length-1];
	var stoh = "";
	if(currenthotspot.stoh != undefined && currenthotspot.stoh == 1){
		stoh = " selected";
	}
	$("#hothome" + cid).hide();
	
	
	$("#hotscreen"+cid).hide().html("<h4>Configs</h4><p>Current Hotspot icon<br>(Click to change):</p><div onclick='changehotspoticon(\""+cid+"\");' style='width: 92px; height: 92px; margin: 0 auto; margin-bottom: 20px; background: url("+projectdir+hotspoticon+") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'></div><input value='"+hotspotfilename+"' readonly onclick='changehotspoticon(\""+cid+"\");'><p>Show title on hover</p><select id='showtitleonhover"+cid+"' onchange='applyshowtoh(\""+cid+"\")'><option value=0>No</option><option value=1"+stoh+">Yes</option></select><p>Current Hotspot location<br>(Click the input below to change)</p><input value='"+currenthotspot.position+"' readonly><div class='button' onclick=hotGoHome(\""+cid+"\") style='margin: 5px;'><i class='fa fa-floppy-o'></i> Save</div><div class='button' onclick=hotGoHome(\""+cid+"\") style='margin: 5px;'><i class='fa fa-times'></i> Close</div>").show();
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
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 0, target : tempSourceFile });
				console.log("Action added");
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 1 :
			showItemChooser(cid, "Choose an Image", "images", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 1, target : tempSourceFile });
				console.log("Action added");
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 2 :
			showItemChooser(cid, "Choose a Video", "videos", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 2, target : tempSourceFile });
				console.log("Action added");
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 3 :
			showItemChooser(cid, "Choose an Audio", "audios", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 3, target : tempSourceFile });
				console.log("Action added");
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
		case 4 :
			showItemChooser(cid, "Choose a PDF", "pdf", function(){
				var res = isCidMatched(cid);							
				currentprojectdata.panoramas[res.pano].hotspots[res.hot].actions.push({ type : 4, target : tempSourceFile });
				console.log("Action added");
				updateWtmFile();
				showeditorc("hotspots");
				hideDim();
			});
			break;
	}
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
	var panoname = panofile.split(".")[0];
	//Let's copy current panorama file to temp panorama directory
	fse.copySync(wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + panofile, __dirname + '/temp/' + panofile);
	fs.readFile(hotpath, 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		var newhtml = data.split("/*panoramas*/")[0] +"/*panoramas*/\n\r" + 
		"var "+panoname+" = new PANOLENS.ImagePanorama( \"temp/" + panofile + "\" );\n" +
			"viewer.add( "+panoname+" );\n" +
			panoname+".addEventListener('progress', function(e){\n" +
				"$(\"#loading\").show();\n" +
			"});\n" + 
			panoname+".addEventListener('load', function(e){\n" +
				"$(\"#loading\").fadeOut();\n" + 
			"});\n" + 
			panoname+".addEventListener('click', function(e){\n" +
			"});\n\r\n\r" +
		"\n\r/*panoramas-end*/" + data.split("/*panoramas-end*/")[1];
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
				} 
			});
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
	pointToFile(["jpg", "jpeg", "png"], function(){
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
	showeditorc("panoramas");
}

function saveProjectSettings(){
	showDim("Saving project...");
	var newtitle = $("#psloadingtext").val();
	var newdescription = $("#psdescription").val();
	var firstpanorama = $("#firstpanorama").val();
	var newcontrols = parseInt($("#pscontrols").val());
	currentprojectdata.settings = {
		loadingtext : newtitle,
		firstpanorama : firstpanorama,
		description : newdescription,
		controls : newcontrols,
	};
	updateWtmFile();
	fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		
		//Update loading text
		var newhtml = data.split("<!--loadingtext--\>")[0] +"<!--loadingtext--\>"+ newtitle +"<!--loadingtext-end--\>"+ data.split("<!--loadingtext-end--\>")[1];
		
		//Updating panoramas (no need, as it handled separately
		//newhtml = newhtml.split("/*panoramas*/")[0] +"/*panoramas*/\n\r"+ generatePanoramas(currentprojectdata.panoramas) +"\n\r/*panoramas-end*/"+ newhtml.split("/*panoramas-end*/")[1];
		
		//Update project description
		newhtml = newhtml.split("<!--projectdescription--\>")[0] +"<!--projectdescription--\><meta name=\"description\" content=\""+newdescription+"\"><!--projectdescription-end--\>"+ newhtml.split("<!--projectdescription-end--\>")[1];
		
		//Update panolens settings
		var cbsetting = "false";
		if(newcontrols == 1)
			cbsetting = "true";
		newhtml = newhtml.split("/*panolens*/")[0] +"/*panolens*/\n\r"+ 
		"var viewer = new PANOLENS.Viewer( { container: container , controlBar: "+cbsetting+",  output: 'console' , autoHideInfospot: false, } );" +
		"\n\r/*panolens-end*/"+ newhtml.split("/*panolens-end*/")[1];
		
		fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
			if (err) return console.log(err);
			showAlert("Project Settings", "Project Settings has been updated successfully.");
		});
	});
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

function addpanorama(){
	var newpanoramapath = "";
	dialog.showOpenDialog({
		properties: ['openFile'],
		filters : [{
			name : 'Images', extensions : ['jpg', 'gif'],
		}]
	}).then(result => {
		//Get the new panorama file path
		newpanoramapath = result.filePaths[0];
		if(newpanoramapath != undefined){
			console.log(newpanoramapath);
			//Renaming the file to better file name
			var newpanoramafile = newpanoramapath.split("\\")[newpanoramapath.split("\\").length-1];
			newpanoramafile = remSpaces(newpanoramafile);
			//Checking duplicate file name to avoid conflicts
			if(foundduplicatepanofile(newpanoramafile))
				newpanoramafile = newpanoramafile.split(".")[0] + randomblah(5) + "." + newpanoramafile.split(".")[newpanoramafile.split(".").length-1];
			console.log("Selected file: " + newpanoramafile);
			//Copying new panorama image to project image directory
			fse.copySync(newpanoramapath, wtmdata.projects[currentprojectindex].projectdir + '/panoramas/' + newpanoramafile);
			console.log("New panorama file copied to project directory.");
			//Pushing new panorama file name to projectdata
			currentprojectdata.panoramas.push({ panofile : newpanoramafile, hotspots : [] });
			//Write new projectdata to wtm file
			updateWtmFile();
			//Regenerate html panoramas
			//generateHTMLPanoramas();
			showDim("Please wait...");
			setTimeout(function(){
				showeditorc('panoramas');
				hideDim();
			},1000);
		}
	});
}

//Generating html for panorama changes
function generateHTMLPanoramas(){
	fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		var newhtml = data.split("/*panoramas*/")[0] +"/*panoramas*/\n\r"+ generatePanoramas(currentprojectdata.panoramas) +"\n\r/*panoramas-end*/"+ data.split("/*panoramas-end*/")[1];
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
						var newhtml = data.split("<title>")[0] + "<title>" +newtitle+ "</title>" + data.split("</title>")[1];
						fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
							if (err) return console.log(err);
							//If everything is done, save it!
							wtmdata.projects[currentprojectindex].projectname = newtitle;
							saveWtmdata();
							showAlert("Project Title Change", "New project title has been updated.");
						});
					});
				});
			});
		},1000);
	}
}

//Remove spaces
function remSpaces(txt){
	//txt.replace(/\s+/g, '').toLowerCase()
	return txt.replace(/\s+/g, '');
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
function pointToFile( exts, fun){
	doit = function(){
		fun();
	}
	
	dialog.showOpenDialog({
		properties: ['openFile'],
		filters : [{
			name : 'Supported Files', extensions : exts,
		}]
	}).then(result => {
		tempSourceFile = result.filePaths[0];
		if(tempSourceFile != undefined){
			tempDestinationFileName = remSpaces(tempSourceFile.split("\\")[tempSourceFile.split("\\").length-1]);
			console.log("Chosen file: " + tempDestinationFileName);
			doit();
		}else{
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
function updateWtmFile(){
	fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/WTMProject.wtm", JSON.stringify(currentprojectdata), function (err,data){});
	//console.log("WTM File Updated.");
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
	
});


function limitHeight(){
	$("#recentprojects").css({ "height" : (innerHeight - 75) + "px", "overflow" : "auto" });
	$("#editorcontent").css({ "height" : (innerHeight-200) + "px" });
	$("#tutorials").css({ "height" : (innerHeight-100) + "px" });
}

$(window).resize(function(){
	limitHeight();
});




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
	app.webContents.openDevTools();
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
	currentprojectdata.panoramas[currentpanoramaindex].hotspots.push({ "hotspotid" : randomblah(10), "title" : arg.title, "position" : arg.position, "actions" : [] });
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








//Scan for plugins and initialize

function ScanForPlugins(){
	
	fs.readdir("plugins", function (err, files) {
		//handling error
		if (err) {
			return console.log('Unable to scan directory: ' + err);
		} 
		//listing all files using forEach
		files.forEach(function (file) {
			var stats = fs.statSync("plugins\\" + file);
			if(stats.isDirectory()){
				console.log("Plugin directory found: " + file);
				
				fs.readFile("plugins\\" + file + "\\plugininfo.txt", 'utf8', function (err, data) {
					if(err){
						console.log("Plugin " + file + " is invalid");
						return;
					}
					
					var plugininfo = data.split("|");
					var status = plugininfo[5];
					var grayscale = "";
					
					var enabledisablebutton = "<button class='greenbutton' onclick=\"DisablePlugin('" +file+ "');\" style='margin: 0px;'><i class='fa fa-plug'></i> Disable Plugin</button>";
					if(status == "status-disabled"){
						enabledisablebutton = "<button onclick=\"EnablePlugin('" +file+ "');\" style='margin: 0px; background-color: gray;'><i class='fa fa-plug'></i> Enable Plugin</button>";
						grayscale = " filter: grayscale(100%);";
					}else{
						$("body").append("<script src='plugins/" +file+ "/" +file+ ".js'></script>");
						console.log("Plugin " + file + " is enabled.");
					}
					$("#pluginlist").append("<div class='pluginbar'><div style='display: table; width: 100%;" +grayscale+ "'><div style='display: table-cell; vertical-align: top; width: 80px;'><img src='plugins/" + file + "/thumbnail.png' style='width: 80px;'></div><div style='display: table-cell; vertical-align: top; padding-left: 1em;'><h2 style='margin: 0px;'>" + plugininfo[0] + "</h2><h5>Version " + plugininfo[1] +" by <a href='" + plugininfo[3] + "'>" + plugininfo[2] + "</a></h5><div>" +plugininfo[4]+ "</div></div></div><div style='text-align: right;'>" +enabledisablebutton+ "</div></div>");
				});
				
			}
		});
		
	});

	
}

function EnablePlugin(p){
	fs.readFile("plugins\\" + p + "\\plugininfo.txt", 'utf8', function (err, data) {
		if(err){
			console.log("Plugin " + p + " is invalid");
			return;
		}
		
		data = data.replace("status-disabled", "status-enabled");
		
		fs.writeFile("plugins\\" + p + "\\plugininfo.txt", data, function (err) {
			if (err) return console.log(err);
			
			reloadApp();
		});
	});
}

function DisablePlugin(p){
	fs.readFile("plugins\\" + p + "\\plugininfo.txt", 'utf8', function (err, data) {
		if(err){
			console.log("Plugin " + p + " is invalid");
			return;
		}
		
		data = data.replace("status-enabled", "status-disabled");
		
		fs.writeFile("plugins\\" + p + "\\plugininfo.txt", data, function (err) {
			if (err) return console.log(err);
			
			reloadApp();
		});
	});
}