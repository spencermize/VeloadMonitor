var stats = {
	speed: 0,
	cadence: 0,
	hr: 0,
	connectionStatus: "",
	sensors: []
}
var Ant = require('ant-plus');
try{
	var stick = new Ant.GarminStick2();
	//console.log(stick);
	var speedCadenceSensor = new Ant.SpeedCadenceSensor(stick);
	//console.log(speedCadenceSensor);
	var hr = new Ant.HeartRateSensor(stick);
	hr.on('attached',function(){
		stats.sensors.push("hr");		
	});
	hr.on('detatched',function(){
		stats.sensors["hr"] = null;
	});
	speedCadenceSensor.on('attached',function(){
		stats.sensors.push("speed");		
		stats.sensors.push("cadence");		
	});
	hr.on('detatched',function(){
		stats.sensors["speed"] = null;
		stats.sensors["cadence"] = null;
	});	
	speedCadenceSensor.setWheelCircumference(2.120); //Wheel circumference in meters

//**********ANT****************
speedCadenceSensor.on('speedData', data => {
  console.log(`speed: ${data.CalculatedSpeed}`);
  stats.speed = data.CalculatedSpeed;
});

speedCadenceSensor.on('cadenceData', data => {
  console.log(`cadence: ${data.CalculatedCadence}`);
  stats.cadence = data.CalculatedCadence;
});

stick.on('startup', function () {
	speedCadenceSensor.attach(0, 0);
	hr.attach(1, 0);
	stats.connectionStatus = "Ant+";
});
hr.on('hbData', function (data) {
    console.log(data.DeviceID, data.ComputedHeartRate);
	stats.hr = data.ComputedHeartRate;
	/*if (data.DeviceID !== 0 && dev_id === 0) {
		dev_id = data.DeviceID;
		console.log(stickid, 'detaching...');
		hr.detach();
		hr.once('detached', function() {
			hr.attach(0, dev_id);
		});
	}*/	
});
if (!stick.open()) {
	console.log('Stick not found!');
}
//**********END ANT****************
}catch(e){
	console.log(e);
}


const electron = require('electron');
const { Menu, Tray } = require('electron');
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
let SerPort = [];

var currSpeed = 0;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow
function createWindow () {
	const express = require('express');
	const cors = require('cors')
	const exp = express();
	const port = 3001;

	setInterval(buildPortList,3000);
	exp.get('/:action',cors(), function(req,res,next){
		let data = "";
		switch (req.params.action) {
			case 'stats' :
				data = stats;
				res.json(data);
				stats.speed = 0;
				stats.cadence = 0;
				stats.hr = 0;				
				break;
			case 'status' :
				data = {"status": stats.connectionStatus}
				res.json(data);
				break;
		}
	})
	exp.post('/:action',cors(), function(req,res,next){
		let data = "";
		switch (req.params.action) {
			case 'circ' : 
				res.json("success!");
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
function updateTray(){
	connect = connectionStatus ? "Connected to " + connectionStatus : "Disconnected";
	//console.log("updateTray");
	let contextMenu = Menu.buildFromTemplate([
		{
			label: 'Veload Monitor'
		},
		{
			type: 'separator'
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

function buildPortList(){
	if(!connectionStatus){
		template = [];
		SerialPort.list(function (err, ports) {
			ports.forEach(function(port) {
				let sp = new SerialPort(port.comName, {autoOpen:false})
				sp.on('open', function(err){
					console.log("open " + this.path);
				});
				sp.on('error', function(err) {
					console.log(err);
					connectionStatus = "";
				});
				sp.open(function (err) {
					if (err) {
						console.log(err);
						return;
					}
					sp.once('data',function(data){
						console.log("connected " + this.path);
						connectionStatus = this.path;
						updateTray();								
					});
					sp.on('close', function(close) {
						console.log(close);
						connectionStatus = "";
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