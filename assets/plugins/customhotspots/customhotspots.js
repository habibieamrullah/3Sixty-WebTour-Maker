$(document).ready(function(){
	$(".editortab").eq(1).after('<div class="editortab" onclick="chShowHotspotIcons()"><i class="fa fa-arrow-circle-up" style="width: 20px;"></i> Hotspot Icons</div>');
});

//Show hotspot icons gallery
function chShowHotspotIcons(){
	var imagefiles = "";
	var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/customhotspots/";
	if (!fs.existsSync(workingdir)){
		fs.mkdirSync(workingdir);
	}
	fs.readdirSync(workingdir).forEach(file =>{
		if(file.split(".")[file.split(".").length-1] == "jpg" || file.split(".")[file.split(".").length-1] == "jpeg" || file.split(".")[file.split(".").length-1] == "png"){
			imagefiles += "<div class='imgthumb' style='position: relative; background: url(" + wtmdata.projects[currentprojectindex].projectdir+"/customhotspots/"+file + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'><span style='background-color: black; color: white; font-weight: bold; padding: 5px; font-size: 10px;'>" + truncate(file, 20) + "</span><div style='position: absolute; bottom: 0; right: 0;'><div onclick=\"showImage('"+file+"', '" + wtmdata.projects[currentprojectindex].projectdir+"/customhotspots/"+file + "');\" class='greenbutton'><i class='fa fa-eye'></i></div><div onclick=removeImageasset('"+wtmdata.projects[currentprojectindex].projectdir+"/customhotspots/"+file+"') class='redbutton'><i class='fa fa-trash'></i></div></div></div>";
		}
		
	});
	$("#editorcontent").html("<h2>Custom Hotspot Icons</h2>" + imagefiles + "<div class='imgthumb' onclick='chAddImageasset()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 40px;'></i></div></div></div>");
}

//Adding new image asset
function chAddImageasset(){
	pointToFile(["jpg", "jpeg", "png"], function(){
		showDim("Adding new file...");
		setTimeout(function(){
			tempDestinationDirectory = wtmdata.projects[currentprojectindex].projectdir + "/customhotspots/";
			addFile(function(){
				setTimeout(function(){hideDim(); chShowHotspotIcons();},500);
			});
		}, 500);
		
	});
}

//Removing image asset
function chRemoveImageasset(f){
	showDim("Removing the file. Please wait...");
	deleteFile(f);
	setTimeout(function(){hideDim(); chShowHotspotIcons();},500);
}

//Set custom hotspot icon
function chSetCustomHotspotIcon(cid, customicon){
	var res = isCidMatched(cid);
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].customicon = customicon;
	updateWtmFile();
	showeditorc("hotspots");
	hideDim();
	
}

//Write custom hotspots HTML part
function chWriteCustomHotspotHtml(){
	
	var customHotspotHtmls = "";
	var customHotspotUpdateCallback = "";
	var customHotspotJS = "";
	
	/*
	if(viewer.panorama == room1){
		ShowMyInfospot(hotspotr1h1, "hotspotr1h1");
	}
	*/
	
	for(var i = 0; i < currentprojectdata.panoramas.length; i++){
		var currentpanorama = currentprojectdata.panoramas[i].panofile.split(".")[0];
		customHotspotUpdateCallback += "\nif(viewer.panorama == " +currentpanorama+ "){\n";
		customHotspotHtmls += "<div class='customhotspot' id='" + currentpanorama + "'>";
		
		
		for(var x = 0 ; x < currentprojectdata.panoramas[i].hotspots.length; x++){
			
			var customhotspot = currentprojectdata.panoramas[i].hotspots[x].customicon;
			if(currentprojectdata.panoramas[i].hotspots[x].customicon != undefined){
				if(currentprojectdata.panoramas[i].hotspots[x].customicon != ""){
					
					var hotspotname = "infospot" + currentprojectdata.panoramas[i].panofile.split(".")[0] + x;
					
					customHotspotHtmls += "<div onclick='chclick"+hotspotname+"();' id='"+hotspotname+"' style='position: fixed; top: 0; left: 0; cursor: pointer;'><img src='customhotspots/" + customhotspot + "' style='width: 64px; height: 64px;'></div>";
					
					customHotspotUpdateCallback += "ShowMyInfospot("+hotspotname+", '"+hotspotname+"');\n";
					
					customHotspotJS += "\nfunction chclick"+hotspotname+"(){ \n";
					
					//Lets check if the infospot has actions in it
					if(currentprojectdata.panoramas[i].hotspots[x].actions.length > 0){
						var cactions = currentprojectdata.panoramas[i].hotspots[x].actions;
						for(var y = 0; y < cactions.length; y++){
							//If it is opening another Panorama
							var actiontype = cactions[y].type;
							if(actiontype == 0){
								var targetpanorama = cactions[y].target.split(".")[0];
								targetpanorama = targetpanorama.split("/")[1];
								customHotspotJS += "ChangePanorama('"+targetpanorama+"');\n\r";
							}else{
								customHotspotJS += "showMedia("+actiontype+", '"+cactions[y].target+"');\n\r";
							}
						}
						
					}
					if(currentprojectdata.panoramas[i].hotspots[x].url != undefined && currentprojectdata.panoramas[i].hotspots[x].url != ""){
						customHotspotJS += "window.open( '"+currentprojectdata.panoramas[i].hotspots[x].url+"', '_blank');\n\r";
					}
					if(currentprojectdata.panoramas[i].hotspots[x].js != undefined && currentprojectdata.panoramas[i].hotspots[x].js != ""){
						customHotspotJS += currentprojectdata.panoramas[i].hotspots[x].js + "\n\r";
					}
					
					customHotspotJS += "}\n";
				}
			}
			
			
			
		}
		
		customHotspotHtmls += "</div>";
		customHotspotUpdateCallback += "}\n";
	}
	
	
	fs.readFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", 'utf8', function (err, data) {
		if (err) { return console.log(err); }
		
		var newhtml = data.split("<!--customhtml--\>")[0] +"<!--customhtml--\>"+ customHotspotHtmls +"<!--customhtml-end--\>"+ data.split("<!--customhtml-end--\>")[1];
		
		newhtml = newhtml.split("/*viewerupdatecallback*/")[0] +"/*viewerupdatecallback*/"+ customHotspotUpdateCallback +"/*viewerupdatecallback-end*/"+ newhtml.split("/*viewerupdatecallback-end*/")[1];
		
		newhtml = newhtml.split("/*customjs*/")[0] +"/*customjs*/"+ customHotspotJS +"/*customjs-end*/"+ newhtml.split("/*customjs-end*/")[1];
		
		fs.writeFile(wtmdata.projects[currentprojectindex].projectdir + "/index.html", newhtml, function (err) {
			if (err) return console.log(err);
			console.log("Done regenerating new HTML after adding custom hotspots.");
		});
	});
}








// OVERRIDING FUNCTIONS

//Showing hotspot icon chooser
function showIconChooser(cid, title){

	
	var itemstochoose = "";
	
	for(var i = 0; i < hotspotIcons.length; i++){
		itemstochoose += "<div onclick='setHotspotIcon(\""+cid+"\", "+i+")' style='display: inline-block; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer;'><div><img src='" +hotspotIcons[i].data+ "' style='height: 32px;'></div></div>";
	}
	
	var customhotspots = "";
	var workingdir = wtmdata.projects[currentprojectindex].projectdir + "/customhotspots/";
	if (!fs.existsSync(workingdir)){
		fs.mkdirSync(workingdir);
	}
	fs.readdirSync(workingdir).forEach(file =>{
		if(file.split(".")[file.split(".").length-1] == "jpg" || file.split(".")[file.split(".").length-1] == "jpeg" || file.split(".")[file.split(".").length-1] == "png"){
			
			customhotspots += "<div onclick='chSetCustomHotspotIcon(\""+cid+"\", \""+file+"\")' style='display: inline-block; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer;'><div><img src='" + workingdir + file+ "' style='height: 48px;'></div></div>";
			
		}
		
	});
	
	$("#dimmessage").html("").html("<div style='width: 100%; max-width: 720px; height: 100%; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-question-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div style='box-sizing: border-box; width: 100%; height: "+(innerHeight-400)+"px; overflow: auto;'><p>Default Icons:</p><div>"+itemstochoose+"</div><p>Custom Icons:</p><div>" + customhotspots + "</div></div><button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
	
}


function ReloadEditorHotspots(){
	var panoswithhots = "";
	for(var i = 0; i < currentprojectdata.panoramas.length; i++){
		var hotspotsofit = "";
		if(currentprojectdata.panoramas[i].hotspots.length == 0){
			hotspotsofit = "<div>There is no hotspot for this panorama.</div>";
		}else{
			for(var x = 0 ; x < currentprojectdata.panoramas[i].hotspots.length; x++){
				var cid = currentprojectdata.panoramas[i].hotspots[x].hotspotid;
				
				var hotspoticon = "/imgs/hotspot.png";
				var customhotspot = currentprojectdata.panoramas[i].hotspots[x].customicon;
				
				
				if(currentprojectdata.panoramas[i].hotspots[x].icon != undefined){
					if(currentprojectdata.panoramas[i].hotspots[x].icon != ""){
						hotspoticon = "/" + currentprojectdata.panoramas[i].hotspots[x].icon;
					}
				}
				
				var currenthActions = "<p>This Hotspot has no action yet. Click Plus button to add an action to it.</p>";
				
				if(currentprojectdata.panoramas[i].hotspots[x].url != undefined || currentprojectdata.panoramas[i].hotspots[x].js != undefined){
					currenthActions = "<p>Actions:</p>";
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
				
				var hotspoticontoshow = hotspotIcons[hiconidx].data;
				if(customhotspot != undefined){
					if(customhotspot != ""){
						hotspoticon = wtmdata.projects[currentprojectindex].projectdir + "/customhotspots/" + customhotspot;
						hotspoticontoshow = hotspoticon;
					}
				}
				
				hotspotsofit = "<div class='hotspotholder'><div class='hotspottitle'><input onkeyup=renameHotspotTitle("+i+","+x+") id='hinput"+cid+"' value='" +currentprojectdata.panoramas[i].hotspots[x].title+ "'></div><div style='padding: 10px; white-space: normal; display: block; box-sizing: border-box;'><div id='hotscreen"+cid+"' style='display: none;'></div><div id='hothome"+cid+"'><div onclick='changehotspoticon(\""+cid+"\");' style='width: 92px; height: 92px; margin: 0 auto; margin-top: 10px; margin-bottom: 10px; background: url("+hotspoticontoshow+") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover;'></div><div>"+currenthActions+"</div></div></div><div align='right'><button style='min-width: 20px;' class='greenbutton' onclick='hotShowAddNewAction(\""+cid+"\")'><i class='fa fa-plus'></i> Action</button><button class='redbutton' style='min-width: 20px;' onclick=removehotspot('"+cid+"');><i class='fa fa-trash'></i> Del.</button></div></div>" + hotspotsofit;
				
			}
		}
		
		hotspotsofit = "<div>" + hotspotsofit + "</div>";
		
		panoswithhots += "<div style='background: url(" + wtmdata.projects[currentprojectindex].projectdir + "/panoramas/" + currentprojectdata.panoramas[i].panofile + ") no-repeat center center; background-size: cover; -webkit-background-size: cover; -moz-background-size: cover; -o-background-size: cover; margin-bottom: 20px; margin-right: 20px;'><div class='brighteronhover' style='padding: 20px;'><div style='border: 2px solid white; color: white; padding: 10px; display: inline-block; margin-bottom: 10px;'>" +currentprojectdata.panoramas[i].panofile+ "</div><div style='overflow: auto; white-space: nowrap;'>" + hotspotsofit + "</div><button style='margin: 0px; margin-top: 10px;' class='greenbutton' onclick=addNewHotspotFor("+i+")><i class='fa fa-plus-square'></i> Add New Hotspot</button></div></div>";
	}
	$("#editorcontent").html("<h2>Hotspots</h2>" + panoswithhots);
	
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
				//$(\"#loading\").fadeOut();\n\
			});\n\
			"+panovar+".addEventListener('click', function(e){\n\
			});\n\r\n\r";
			
			for( var x = 0; x < arr[i].hotspots.length; x++){
				
				var hicon = 0;
				if(arr[i].hotspots[x].icon != undefined){
					hicon = arr[i].hotspots[x].icon;
				}
				
				var hascustomhotspot = false;
				if(arr[i].hotspots[x].customicon != undefined){
					if(arr[i].hotspots[x].customicon != ""){
						hascustomhotspot = true;
					}
				}
				
				if(hascustomhotspot){
					pdata += "var infospot"+panovar+x+" = new PANOLENS.Infospot( 512, hotspotIcons["+hicon+"].data, true );\n\
					infospot"+panovar+x+".position.set( "+arr[i].hotspots[x].position+" );\n\
					infospot"+panovar+x+".visible = false;\n\
					"+panovar+".add(infospot"+panovar+x+");\n\r";
				}else{
					pdata += "var infospot"+panovar+x+" = new PANOLENS.Infospot( 512, hotspotIcons["+hicon+"].data, true );\n\
					infospot"+panovar+x+".position.set( "+arr[i].hotspots[x].position+" );\n\
					"+panovar+".add(infospot"+panovar+x+");\n\r";
				}
				
				
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
							pdata += "ChangePanorama('"+targetpanorama+"');\n\r";
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
		
		pdata += "$(document).ready(function(){ ChangePanorama('" + remSpaces(currentprojectdata.settings.firstpanorama.split(".")[0]) + "'); });\n";
		
	}
	return pdata;
}



//Set chosen item of hotspot icon
function setHotspotIcon(cid, idx){
	var res = isCidMatched(cid);
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].icon = idx;
	currentprojectdata.panoramas[res.pano].hotspots[res.hot].customicon = "";
	updateWtmFile();
	showeditorc("hotspots");
	hideDim();
}

function previewProject(idx){
	showDim("Building...");
	
	chWriteCustomHotspotHtml();
	
	setTimeout(function(){
		generateHTMLPanoramas();
		
		setTimeout(function(){
			var ppath = wtmdata.projects[idx].projectdir + "/index.html";
			var newwin = new BrowserWindow({ width: 1280, height : 720, title : "Project Preview", icon: "icon.ico", });
			newwin.loadFile(ppath);
			newwin.removeMenu();
			//newwin.webContents.openDevTools();
			hideDim();
		}, 2000);
	}, 2000);
	
}