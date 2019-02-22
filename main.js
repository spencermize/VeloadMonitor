const electron = require('electron');
const { Menu, Tray } = require('electron');
const app = electron.app
const port = 3001;
let appIcon; 
const {autoUpdater} = require("electron-updater");
const path = require('path');

const usbDetect = require('usb-detection');
usbDetect.startMonitoring();

const Store = require('electron-store');
const store = new Store();

app.on('ready', function(){
	createApp();
	autoUpdater.checkForUpdatesAndNotify();	
});

// *************Autolaunch**************
app.setLoginItemSettings({
	openAtLogin: true
});

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
	stick: store.get('stick','GarminStick2'),
	circ: 2.120
}
  //**********ANT****************

var hrTimeout,cadenceTimeout,speedTimeout;
var Ant = require('ant-plus');
var stickObj = "";
var speedCadenceSensor = "";
var hr = "";
usbDetect.on('change', function(device) {
	refreshConnection("usb changed");
});

function refreshConnection(error){
	console.log(error);
	app.relaunch()
	app.quit();
}
function attachSensors(){
	try{
		speedCadenceSensor.attach(0, 0)				
	}catch(error){
		console.log('cannot attach speedcadence');
		refreshConnection(error)
	}
}
function setupAnt(){
	try{
		stickObj = new Ant[stats.stick]();
		speedCadenceSensor = new Ant.SpeedCadenceSensor(stickObj);
		hr = new Ant.HeartRateSensor(stickObj);
		speedCadenceSensor.setWheelCircumference(stats.circ); //Wheel circumference in meters
		stickObj.on('startup', function () {
			console.log(`${stats.stick} connected`);
			attachSensors();
			stats.status = "Ant+";
		});

		stickObj.on('shutdown',function(){
			stats.status = "";
		})
		console.log(`attempting to connect to ${stats.stick}`);

		stickWait = stickObj.openAsync(function(err){
			if(err){
				console.log(err);
				throw new Error("unable to open stick (from the main loop)")
			}
		});
		speedCadenceSensor.on("attached",function(){
			console.log("attached to speedcadence")
			try{
				hr.attach(1, 0);
			}catch(error){
				console.log('cannot attach hr')
				refreshConnection(error)				
			}
		});		
		hr.on("attached",function(){
			console.log("attached to hr")
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
		speedCadenceSensor.on("detached",function(){
			console.log('detached speedcadence sensor');
			hr.detach();
		});
		hr.on("detached",function(){
			console.log('detached hr');
		})		
	}catch(e){
		console.log(e);
		app.relaunch()
		app.quit();
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
	const https = require('https')
	const express = require('express');
	const cors = require('cors');
	const fs = require('fs');
	const exp = express();
	const spdy = require('spdy')
/*
	var key;
	var cert;
	try{
		key = fs.readFileSync('server.key'),
		cert = fs.readFileSync('server.cert')
	}catch(err){
		console.log('no valid cert found - generating new...')
		var attrs = [{ name: 'commonName', value: 'veload.bike' }];
		var pems = selfsigned.generate(attrs, { days: 365 });
		key = pems.private;
		cert = pems.cert;
		try{
			fs.writeFileSync("./server.key",key);
			fs.writeFileSync("./server.cert",cert);
		}catch(err){
			console.log('unable to write certificate');
		}
	}*/

	exp.get('/:action',cors(), function(req,res,next){
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
		switch (req.params.action) {
			case 'circ' : 
				try{
					if(req.query.value){
						stats.circ = new Number(req.query.value);
					}else{
						throw new Error("no value set");
					}
					speedCadenceSensor.setWheelCircumference(req.query.value);
					res.json({status:"success"});
				}catch(error){
					console.log(error);
					res.json({status:"fail", error: error.toString()});
				}
				break;
		}
	});
	try{
		/*var spdyOptions = {
			//key: key,
			//cert: cert,
			spdy:{
				protocols: [ 'h2', 'http/1.1' ],
				plain: false ,
				ssl: false
			}
		};
		var server = require('spdy').createServer(spdyOptions, exp);
		server.on('error', function (err) {
		  console.error(err);
		});
		server.on('listening', function () {
		  console.log("Listening for SPDY/http2/https requests on", this.address());
		  setupAnt(); 
		  createTray();
		  setInterval(updateTray,3000);
		  setInterval(refreshConnection,2000); 
		  
		});
		server.listen(port);*/
		exp.listen(port, () => {
			console.log(`Server listenening on ${port}`);
			setupAnt(); 
			createTray();
			setInterval(updateTray,3000);
			//setInterval(refreshConnection,3000); 
		  });			
	}catch(error){
		console.log('unable to start server...')
		console.log(error);
		app.relaunch()
		app.quit();
	}

	
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
function updateTray(){
	var connect = stats.status ? "Connected to " + stats.status : "Disconnected";
	var hr = (Math.max(stats.hr,0)||"no data").toString();
	var speed = (Math.max(stats.speed,0)||"no data").toString();
	var cadence = (Math.max(stats.cadence,0)||"no data").toString();
	if(stats.status){
		var sub = [
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
	}
	let contextMenu = Menu.buildFromTemplate([
		{
			label: 'Open Veload Dashboard',
			sublabel: 'Version: ' + app.getVersion(),
			click: function(){
				require('electron').shell.openExternal('https://veload.bike/dashboard');
			}
		},{
			label: 'Broadcasting on:',
			sublabel: `http://127.0.0.1:${port},${getAddresses()}`
		},
		{
			type: 'separator'
		},
		{
			label: 'Stick Type',
			submenu: [
				{
					label: 'Generation 2',
					type: 'checkbox',
					checked: stats.stick == "GarminStick2",
					click: function(){
						stats.stick = "GarminStick2";
						store.set('stick','GarminStick2');
						refreshConnection(true)
					}
				},
				{
					label: 'Generation 3',
					type: 'checkbox',
					checked: stats.stick == "GarminStick3",
					click: function(){
						stats.stick = "GarminStick3";
						store.set('stick','GarminStick3');
						refreshConnection(true)
					}					
				},
			]
		},		
		{
			label: 'Status:',
			sublabel: connect,
			submenu: sub || false
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
	if(!appIcon){
		if(!app.isPackaged){
			appIcon = new Tray('icon.png');
		}else{
			appIcon = new Tray(path.resolve(`${process.resourcesPath}/../icon.png`));
		}
		appIcon.setToolTip('Veload Monitor');
	}
}
function getAddresses(){
	var os = require('os');

	var interfaces = os.networkInterfaces();
	var addresses = [];
	for (var k in interfaces) {
		for (var k2 in interfaces[k]) {
			var address = interfaces[k][k2];
			if (address.family === 'IPv4' && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	return `http://${addresses.join(", http://")}:${port}`;
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