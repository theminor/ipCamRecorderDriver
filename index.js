var util = require('util');
var stream = require('stream');
var exec = require('child_process').exec;

util.inherits(Driver,stream);
util.inherits(Device,stream);

// not so elegant way to store all of the devices created by the driver, plus a few variables...
var deviceList = [];
var pauseAfterSetToUpdate = 5000; // in milliseconds
var updateInterval = 300000; // in milliseconds
var camList = [
	{
		name: 'garage',
		recordCommand: 'ssh name@192.168.1.111 ~/ipcam.sh start camera1',
		stopCommand: 'ssh name@192.168.1.111 ~/ipcam.sh stop camera1',		
		checkStatusCommand: 'ssh name@192.168.1.111 ls ~/camera1*',
	}
];

function Driver(opts,app) {
	var self = this;
	this._app = app;
	this.opts = opts;
	if (opts.pauseAfterSetToUpdate) pauseAfterSetToUpdate = opts.pauseAfterSetToUpdate;  // ugly way to track these, but it should work for now...    
	if (opts.updateInterval) updateInterval = opts.updateInterval;
	if (opts.camList) camList = opts.camList;                	
	app.once('client::up',function(){
		camList.forEach(function(cam) {
			var d = new Device(app, opts);
			d.camInfo = cam;
			self.emit('register', d);
			deviceList.push(d);
		});
		updateDevices(app, opts);
		process.nextTick(function() {        // Once all devices are set up, establish a single update process that updates every "updateInterval" seconds
			setInterval(function() {
				updateDevices(app, opts);
			}, updateInterval);
		});
	}.bind(this));
};

function Device(app, config) {
	app.log.info('Creating ipCamRecorderDriver Device : ' + config.name);
	var self = this;
	this._app = app;
	this.config = config;
	this.readable = true;
	this.writeable = true;
	app.log.info('ipCamRecorderDriver Device ' + config.name + ' is readable and writable');
	this.V = 0; // Vendor ID
	this.D = 244; // Device ID 244 is Generic State Device
	this.G = 'ipcr' + (config.name).replace(/[^a-zA-Z0-9]/g, '');
	this.name = 'ipCamRecorderDriver - ' + config.name;
	// this.read();
};

function updateDevices(app, opts) {        // runs every "updateInterval" seconds
	app.log.info("Updating all ipCamRecorderDriver Devices...");
	deviceList.forEach(function(device) {
		updateDevice(app, opts, device);
	});
};


function updateDevice(app, opts, device) {	// called when you want to check the status of a cam
	return executeShellCmd(device.camInfo.checkStatusCommand, device, app);
	app.log.info(device.name + " executing command : " + device.camInfo.checkStatusCommand);
	exec(device.camInfo.checkStatusCommand, function(error, stdout, stderr) {
		app.log.info("Result of ipCamRecorderDriver command: " + stdout);
		if (error) {
			app.log.warn('ipCamRecorderDriver : ' + device.name + ' error! - ' + error);
			return false;
		}
		else if (stderr) {
			app.log.warn('ipCamRecorderDriver : ' + device.name + ' stderr! - ' + stderr);
			return false;
		}
		else {
			var parsedResult = (stdout + '');
			app.log.info('Updating ipCamRecorderDriver Device: ' + dev.name + ' - emmitting data: ' + parsedResult);
			dev.emit('data', parsedResult);
		};
	});
};	

Device.prototype.write = function(dataRcvd) {	// called to start ("record") or stop a cam
	var app = this._app;
	var opts = this.opts;
	app.log.info("ipCamRecorderDriver Device " + this.name + " received data: " + dataRcvd);
	var issueCmd = undefined;
	if (dataRcvd == "record") issueCmd = device.camInfo.recordCommand; else if (dataRcvd == "stop") issueCmd = device.camInfo.stopCommand; else issueCmd = undefined;;
	app.log.info(device.name + " executing command : " + issueCmd);
	exec(issueCmd, function(error, stdout, stderr) {
		app.log.info("Result of ipCamRecorderDriver command: " + stdout);
		if (error) {
			app.log.warn('ipCamRecorderDriver : ' + device.name + ' error! - ' + error);
			return false;
		}
		else if (stderr) {
			app.log.warn('ipCamRecorderDriver : ' + device.name + ' stderr! - ' + stderr);
			return false;
		}
		else {
			var parsedResult = (stdout + '');
			if (parsedResult);		
		};
	});
};

Driver.prototype.config = function(rpc,cb) {
	var self = this;
	if (!rpc) {
		this._app.log.info("ipCamRecorderDriver main config window called");
		return cb(null, {        // main config window
			"contents":[
				{ "type": "paragraph", "text": "The ipCamRecorderDriver calls shell commands intended to start, stop, and check the status of an IP camera. Enter the settings below to get started, and please make sure you get a confirmation message after hitting 'Submit' below. (You may have to click it a couple of times. If you don't get a confirmation message, the settings did not update!)"},
				{ "type": "input_field_text", "field_name": "pause_aft_updt_secs_text", "value": pauseAfterSetToUpdate/1000, "label": "Seconds to Pause After a Command Before Updating", "placeholder": pauseAfterSetToUpdate/1000, "required": true},
				{ "type": "input_field_text", "field_name": "update_interval_text", "value": updateInterval/1000, "label": "How frequently to update data in seconds. (NOTE each update counts as an api call, so limit this per the number of calls per day your api plan allows)", "placeholder": updateInterval/1000, "required": true},
				{ "type": "submit", "name": "Add New", "rpc_method": "add_new_cam" },
				{ "type": "submit", "name": "Remove Existing", "rpc_method": "remove_cam" },
				{ "type": "paragraph", "text": " "},
				{ "type": "submit", "name": "Submit", "rpc_method": "submt" },
				{ "type": "close", "name": "Cancel" },
			]
		});
	}
//	{
//		name: 'garage',
//		recordCommand: 'ssh name@192.168.1.111 ~/ipcam.sh start camera1',
//		stopCommand: 'ssh name@192.168.1.111 ~/ipcam.sh stop camera1',		
//		checkStatusCommand: 'ssh name@192.168.1.111 ls ~/camera1*',
//	}
	else if (rpc.method == "add_new_cam") {
		this._app.log.info("ipCamRecorderDriver add_new_cam window called");
		cb(null, {
			"contents": [
				{ "type": "input_field_text", "field_name": "new_cam_name", "label": "Name of New IP Camera", "placeholder": "Front Door", "required": true},
				{ "type": "input_field_text", "field_name": "new_cam_record_command", "label": "Shell Command to start recording", "placeholder": "ssh name@192.168.1.111 ~/ipcam.sh start camera1", "required": true},
				{ "type": "input_field_text", "field_name": "new_cam_stop_command", "label": "Shell Command to stop recording", "placeholder": "ssh name@192.168.1.111 ~/ipcam.sh stop camera1", "required": true},
				{ "type": "input_field_text", "field_name": "new_cam_status_command", "label": "Shell Command to check status", "placeholder": "ssh name@192.168.1.111 ~/ipcam.sh status camera1", "required": true},
				{ "type": "paragraph", "text": " "},
				{ "type": "submit", "name": "Submit", "rpc_method": "new_cam_submt" },
				{ "type": "close", "name": "Cancel" },
			]
		}); 
		return;                        
	}
	else if (rpc.method == "remove_cam") {
		this._app.log.info("ipCamRecorderDriver remove_cam window called");
		var opts = { "contents": [
			{ "type": "input_field_select", "field_name": "remove_cam_select", "options": [], "label": "Select Cam to Remove", "required": true },
			{ "type": "paragraph", "text": " "},
			{ "type": "submit", "name": "Submit", "rpc_method": "remove_cam_submt" },
			{ "type": "close", "name": "Cancel" },
		]};
		deviceList.forEach(function (device) {
			opts.contents[0].options.push(
				{ "name": device.name }   //[{ "name": "Fahrenheit", "value": true, "selected": useFahrenheit}, { "name": "Celsius", "value": false, "selected": !useFahrenheit}]
			);
		});
		cb(null, opts);
		return;                        
	}
	else if (rpc.method == "new_cam_submt") {
		// *** TODO
	}
	else if (rpc.method == "remove_cam_submt") {
		// *** TODO
	}
	else if (rpc.method == "submt") {
		// *** TODO

		
		/*
		this._app.log.info("ipCamRecorderDriver config window submitted. Checking data for errors...");
		// check for errors
		if (!(rpc.params.zip_code_text >= 0)) {        // zip_code_text must evaluate to a positive number or 0
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "zip code must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;                        
		}
		else if (!(rpc.params.pause_aft_updt_secs_text >= 0)) {        // pause_aft_updt_secs_text must evaluate to a positive number or 0
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'pause after update' interval must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;                                
		}
		else if (!(rpc.params.update_interval_text >= 0)) {        // update_interval_text must evaluate to a positive number or 0
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The 'update interval' must be a number and can't be negative. Please try again." },
					{ "type": "close"    , "name": "Close" }
				]
			});                        
			return;                                
		}                
		else {        // looks like the submitted values were valid, so update
			this._app.log.info("ipCamRecorderDriver data appears valid. Saving settings...");
			self.opts.apiKey = rpc.params.api_text;
			self.opts.zipCode = rpc.params.zip_code_text;
			self.opts.useFahrenheit = rpc.params.use_fahrenheit_select;
			self.opts.pauseAftUpdt = rpc.params.pause_aft_updt_secs_text * 1000; // also need this in milliseconds
			self.opts.updateInterval = rpc.params.update_interval_text * 1000; // also need this in milliseconds                        
			apiKey = self.opts.apiKey; // ugly way to track these, but it should work for now...
			zipCode = self.opts.zipCode;
			useFahrenheit = self.opts.useFahrenheit;
			pauseAftUpdt = self.opts.pauseAftUpdt;
			updateInterval = self.opts.updateInterval;                        
			self.save();
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "Configuration was successful. ipCamRecorderDriver values should update shortly!" },
					{ "type": "close"    , "name": "Close" }
				]
			});
			updateDevices(this._app, self.opts);
		};
		*/
	}
	else {
		this._app.log.info("ipCamRecorderDriver - Unknown rpc method was called!");
	};
};

module.exports = Driver;
