const { ipcMain, app, BrowserWindow } = require('electron')

function createWindow () {
	const win = new BrowserWindow({
		width: 1280,
		height: 720,
		frame: false,
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
		}
	})

	win.loadFile('index.html')
	win.webContents.openDevTools();
	win.maximize();
	win.removeMenu();
	
	ipcMain.on("infospotlocationreceived", (evt, arg) => {
		win.webContents.send("setnewinfospotlocation", arg);
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
})

ipcMain.on('quitprogram', (evt, arg) => {
	app.quit();
});