const electron = require('electron')
const { Menu, Tray } = require('electron')
// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

const path = require('path')
const url = require('url')

let appIcon,connectionStatus = ""; 
let template = [];
//hardware connections
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const parser = new Readline()
let SerPort;
var currSpeed = 0;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
function createWindow () {
	appIcon = new Tray('icon.png');
	const express = require('express');
	const exp = express();
	const port = 3001;
	buildPortList();
	// Open the hardware
	parser.on('data', function(data){
		currSpeed = data;
	})
	exp.get('/:action', function(req,res,next){
		let data = "";
		switch (req.params.action) {
			case 'speed' :
				data = {"speed":currSpeed};
				res.json(data);
				break;
		}
	})
	exp.listen(port, () => {
	  console.log(`Server listenening on ${port}`);
	});
	
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  app.quit()
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

function createTray(template){
	  // Create the browser window.
	appIcon.setToolTip('Veload Monitor');
	connect = connectionStatus.length>0 ? "Connected to " + connectionStatus : "Disconnected";
	let contextMenu = Menu.buildFromTemplate([
		{
			label: 'Veload Monitor'
		},
		{
			label: 'Status:',
			enabled: false,
			sublabel: connect
		},		
		{
			type: 'separator'
		},
		{
			label: 'Ports',
			submenu: template
		},
		{
			type: 'separator'
		},
		{
			label: 'Quit',
			role: 'quit'
		}
	])
	// Call this again for Linux because we modified the context menu
	return appIcon.setContextMenu(contextMenu)
}

function buildPortList(){
	SerialPort.list(function (err, ports) {
		template = [];
		ports.forEach(function(port) {
			let status = connectionStatus == port.comName ? true : false;
			template.push({
				label: port.comName,
				type: "radio",
				checked: status,
				click: function(m,b,e){
					if(SerPort && SerPort.isOpen){
						SerPort.close();
					}
					SerPort = new SerialPort(m.label, { baudRate: 9600 })
					SerPort.on('open', function(){
						connectionStatus = m.label;
						buildPortList();
						createTray(template);
					});
					SerPort.on('error,close', function(err) {
						connectionStatus = "";
						buildPortList();
						createTray(template)
					});
					SerPort.pipe(parser)
				}
			});
			createTray(template);
		});
	});
}