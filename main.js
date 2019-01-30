const electron = require('electron');
const { Menu, Tray } = require('electron');
const app = electron.app
const AutoLaunch = require('auto-launch');

let appIcon; 
const {autoUpdater} = require("electron-updater");

const usbDetect = require('usb-detection');
usbDetect.startMonitoring();

app.on('ready', function(){
	createApp();
	autoUpdater.checkForUpdatesAndNotify();	
});

// *************Autolaunch**************
var veloadAutoLauncher = new AutoLaunch({
    name: 'VeloadListener'
});
 
veloadAutoLauncher.enable();

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
  //**********ANT****************

var hrTimeout,cadenceTimeout,speedTimeout;
var Ant = require('ant-plus');
var stick = "";

usbDetect.on('change', function(device) {setupAnt()});
setupAnt();
function setupAnt(){
	try{
		stick = new Ant.GarminStick2();
		var speedCadenceSensor = new Ant.SpeedCadenceSensor(stick);
		var hr = new Ant.HeartRateSensor(stick);

		speedCadenceSensor.setWheelCircumference(stats.wheelCircumference); //Wheel circumference in meters

		stick.on('startup', function () {
			console.log('stick startup');
			try{
				speedCadenceSensor.attach(0, 0);
				hr.attach(1, 0);
				stats.status = "Ant+";
			}catch(error){
				console.log(error);
			}
		});

		stick.on('shutdown',function(){
			stats.status = "";
		})
		console.log('attempting to connect to stick');
		stick.openAsync(function(err){
			if(err){
				console.log('unable to connect to stick');
				console.log(err)
			}else{
				console.log('opened')
			}
		})
		speedCadenceSensor.on('speedData', data => {
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
}
//**********END ANT****************

//hardware connections
/*
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
let SerPort = [];
*/

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
	try{
		exp.listen(port, () => {
			console.log(`Server listenening on ${port}`);
			createTray();
		  });
	}catch(error){

	}
	
	
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function updateTray(){
	var connect = stats.status ? "Connected to " + stats.status : "Disconnected";
	var hr = (Math.max(stats.hr,0)||"no data").toString();
	var speed = (Math.max(stats.speed,0)||"no data").toString();
	var cadence = (Math.max(stats.cadence,0)||"no data").toString();
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
					enabled: stats.sensors.hr,
					checked: stats.sensors.hr,
					sublabel: hr
				},
				{
					label: 'Speed',
					type: 'checkbox',
					enabled: stats.sensors.speed,
					checked: stats.sensors.speed,
					sublabel: speed
				},
				{
					label: 'Cadence',
					type: 'checkbox',
					enabled: stats.sensors.cadence,
					checked: stats.sensors.cadence,
					sublabel: cadence
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