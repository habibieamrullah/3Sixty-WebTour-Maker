//Showing hotspot icon chooser
function showIconChooser(cid, title){

	
	var itemstochoose = "";
	
	for(var i = 0; i < hotspotIcons.length; i++){
		itemstochoose += "<div onclick='setHotspotIcon(\""+cid+"\", "+i+")' style='display: inline-block; margin-right: 10px; margin-bottom: 10px; text-align: center; cursor: pointer;'><div><img src='" +hotspotIcons[i].data+ "' style='height: 32px;'></div></div>";
	}
	
	$("#dimmessage").html("").html("<div style='width: 100%; max-width: 720px; height: 100%; margin: 0 auto;'><div style='background-color: #2c3643; color: white; padding: 10px;'><i class='fa fa-question-circle'></i> " +title+ "</div><div style='padding: 30px; background-color: #3d4855; font-size: 14px; font-weight: normal;'><div style='box-sizing: border-box; width: 100%; height: "+(innerHeight-400)+"px; overflow: auto;'>"+itemstochoose+"</div><button onclick='hideDim()' style='margin-left: 10px; margin-top: 20px; margin-bottom: 0px;'><i class='fa fa-times'></i> Close</button></div></div>");
	$("#dim").show();
	$("#loading").hide();
	

}


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
	$("#editorcontent").html("<h2>Custom Hotspot Icons</h2>" + imagefiles + "<div class='imgthumb' onclick='addImageasset()'><div style='cursor: pointer; display: table; width: 100%; height: 100%;'><div style='display: table-cell; text-align: center; vertical-align: middle;'><i class='fa fa-plus' style='font-size: 40px;'></i></div></div></div>");
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