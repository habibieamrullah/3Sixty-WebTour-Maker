var panothumbs = "";
for(var i = 0; i < viewer.scene.children.length; i++){
	panothumbs+= "<div onclick=ChangePanorama('" +viewer.scene.children[i].src.split(".")[0].replace("panoramas/", "")+ "');><img src='" + viewer.scene.children[i].src + "' style='height: 3em; padding: 0.5em;'></div>";
}
$("body").append("<div style='position: fixed; top: 0; left: 0; z-index; 1;'><div style='padding: 0.5em;' onclick=$('#panolist').toggle()><i class='fa fa-bars'></i></div></div><div id='panolist' style='position: fixed; top: 0; left: 0; bottom: 0; background-color: rgba(0,0,0,.85); backdrop-filter: blur(5px); overflow: auto; z-index: 1;'><div onclick=$('#panolist').toggle() style='padding: 0.5em;'><i class='fa fa-chevron-left'></i> Hide</div>" +panothumbs+ "</div>");

function ChangePanorama(panorama){
	if(panorama != currentPanorama){
		currentPanorama = panorama;
		HideInfospots(); 
		$("#loading").fadeIn();
		//$(".customhotspot").fadeOut();
		setTimeout(function(){
			viewer.setPanorama(window[panorama]);
		}, 100);
		setTimeout(function(){
			$("#" + panorama).fadeIn();
		}, 1000);
	}
}