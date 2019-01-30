const {autoUpdater} = require("electron-updater");
// when the app is loaded create a BrowserWindow and check for updates
app.on('ready', function() {
	createDefaultWindow()
	autoUpdater.checkForUpdates();
  });
  
  // when the update has been downloaded and is ready to be installed, notify the BrowserWindow
  autoUpdater.on('update-downloaded', (info) => {
	  win.webContents.send('updateReady')
  });
  
  // when receiving a quitAndInstall signal, quit and install the new version ;)
  ipcMain.on("quitAndInstall", (event, arg) => {
	  autoUpdater.quitAndInstall();
  })
//**********ANT****************
var stats = {
	speed: 0,
	cadence: 0,
	hr: 0,
	status: "",
	sensors: {
		hr: false,
		speed: false,
		cadence: false
	},
	wheelCircumference: 2.120
}
var hrTimeout,cadenceTimeout,speedTimeout;
var Ant = require('ant-plus');
try{
	var stick = new Ant.GarminStick2();
	var speedCadenceSensor = new Ant.SpeedCadenceSensor(stick);
	var hr = new Ant.HeartRateSensor(stick);
	hr.on('attached',function(){
				
	});
	hr.on('detatched',function(){
		
	});
	speedCadenceSensor.on('attached',function(){
				
	});
	hr.on('detatched',function(){
		
	});	
	speedCadenceSensor.setWheelCircumference(stats.wheelCircumference); //Wheel circumference in meters

stick.on('startup', function () {
	try{
		speedCadenceSensor.attach(0, 0);
		hr.attach(1, 0);
		stats.status = "Ant+";
	}catch(error){
		console.log(error);
	}
});

if (!stick.open()) {
	console.log('Stick not found!');
}

speedCadenceSensor.on('speedData', data => {
  console.log(`speed: ${data.CalculatedSpeed}`);
  stats.sensors.speed = true;  
  stats.speed = data.CalculatedSpeed;

  if(speedTimeout){
	  clearTimeout(speedTimeout);
  }
  speedTimeout = setTimeout(function(){
	  stats.sensors.speed = false;
  },5000);  
});

speedCadenceSensor.on('cadenceData', data => {
  console.log(`cadence: ${data.CalculatedCadence}`);
  stats.sensors.cadence = true;  
  stats.cadence = data.CalculatedCadence;

  if(cadenceTimeout){
	clearTimeout(cadenceTimeout);
  }
  cadenceTimeout = setTimeout(function(){
	  stats.sensors.cadence = false;
  },5000); 
});

hr.on('hbData', function (data) {
    console.log(data.DeviceID, data.ComputedHeartRate);
	stats.sensors.hr = true;
	stats.hr = data.ComputedHeartRate;

	if(hrTimeout){
		clearTimeout(hrTimeout);
	}
	hrTimeout = setTimeout(function(){
		stats.sensors.hr = false;
	},5000);

});


}catch(e){
	console.log(e);
}
//**********END ANT****************

const electron = require('electron');
const { Menu, Tray } = require('electron');
// Module to control application life.
const app = electron.app
// Module to create native browser window.

let appIcon,status = ""; 
//hardware connections
/*
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
let SerPort = [];
*/

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
function createApp () {
	const express = require('express');
	const cors = require('cors')
	const exp = express();
	const port = 3001;

	setInterval(updateTray,3000);
	exp.get('/:action',cors(), function(req,res,next){
		let data = "";
		switch (req.params.action) {
			case 'stats' :
			case 'status' :
				res.json(stats);
				stats.speed = -1;
				stats.cadence = -1;
				stats.hr = -1;				
				break;
		}
	})
	exp.post('/:action',cors(), function(req,res,next){
		let data = "";
		switch (req.params.action) {
			case 'circ' : 
				try{
					stats.wheelCircumference = req.query.size;
					speedCadenceSensor.setWheelCircumference(req.query.size);
					res.json({status:"success"});
				}catch(error){
					res.json(error);
				}
				break;
		}
	});
	exp.listen(port, () => {
	  console.log(`Server listenening on ${port}`);
	  createTray();
	});
	
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createApp)

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function updateTray(){
	var connect = stats.status ? "Connected to " + stats.status : "Disconnected";
	//console.log("updateTray");
	let contextMenu = Menu.buildFromTemplate([
		{
			label: 'Open Veload Dashboard',
			click: function(){
				require('electron').shell.openExternal('https://home.spencerm.pro/dashboard');
			}
		},
		{
			type: 'separator'
		},		
		{
			label: 'Status:',
			sublabel: connect,
			submenu: [
				{
					label: 'HR',
					type: 'checkbox',
					enabled: false,
					checked: stats.sensors.hr
				},
				{
					label: 'Speed',
					type: 'checkbox',
					enabled: false,
					checked: stats.sensors.speed
				},
				{
					label: 'Cadence',
					type: 'checkbox',
					enabled: false,
					checked: stats.sensors.cadence
				}
			]
		},		
		{
			type: 'separator'
		},
		{
			label: 'Quit',
			role: 'quit'
		}
	])
	appIcon.setContextMenu(contextMenu)
}
function createTray(){
	appIcon = new Tray('icon.png');
	appIcon.setToolTip('Veload Monitor');
}
/*
function buildPortList(){
	if(!status){
		template = [];
		SerialPort.list(function (err, ports) {
			ports.forEach(function(port) {
				let sp = new SerialPort(port.comName, {autoOpen:false})
				sp.on('open', function(err){
					console.log("open " + this.path);
				});
				sp.on('error', function(err) {
					console.log(err);
					status = "";
				});
				sp.open(function (err) {
					if (err) {
						console.log(err);
						return;
					}
					sp.once('data',function(data){
						console.log("connected " + this.path);
						status = this.path;
						updateTray();								
					});
					sp.on('close', function(close) {
						console.log(close);
						status = "";
					});
				})
				sp.pipe(parser);
				SerPort.push(sp)
			});
			updateTray();
		});
	}
}
const parser = new Readline();
parser.on('data', function(data){
	//console.log(data);
	currSpeed = data;
})
*/

var AutoLaunch = require('auto-launch');
 
var veloadAutoLauncher = new AutoLaunch({
    name: 'VeloadListener',
    path: '/Applications/VeloadListener.app',
});
 
veloadAutoLauncher.enable();