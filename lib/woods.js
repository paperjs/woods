var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter;

var fsUtil = require('./fs-util');

var woods = new EventEmitter();
woods.express = require('express')();
woods.sites = [];
woods.initialize = function (directory, port, callback) {
	port = port || 3000;
	woods.express.listen(port);
	woods.url = 'http://localhost:' + port;
	var site = new Site(woods, directory, callback);
	return woods;
};

module.exports = woods;

var Site = require('./Site');
require('./Site-sync');