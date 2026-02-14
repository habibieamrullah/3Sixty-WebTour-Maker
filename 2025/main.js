const { ipcMain, app, BrowserWindow } = require('electron')
//const path = require('path');

function createWindow () {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		frame: false,
		icon: "icon.ico",
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true,
			webviewTag: true,
			//preload: path.join(__dirname, 'preload.js') // kalau mau akses shell dari renderer
		}
	});

	win.loadFile('index.html');
	
	//win.webContents.openDevTools();
	win.maximize();
	win.removeMenu();
	
	/*
	// Intersepsi link keluar
	win.webContents.setWindowOpenHandler(({ url }) => {
		shell.openExternal(url); // buka di browser eksternal
		return { action: 'deny' }; // tolak buka di Electron
	});

	// Tangkap navigasi langsung (misalnya location.href)
	win.webContents.on('will-navigate', (event, url) => {
		if (!url.startsWith('file://')) {
		  event.preventDefault();
		  shell.openExternal(url);
		}
	});
	*/
	
	
	ipcMain.on("infospotlocationreceived", (evt, arg) => {
		win.webContents.send("setnewinfospotlocation", arg);
	});
	
	ipcMain.on("infospotlocationupdated", (evt, arg) => {
		win.webContents.send("updateinfospotlocation", arg);
	});
	
	

}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
});



ipcMain.on('quitprogram', (evt, arg) => {
	app.quit();
});
