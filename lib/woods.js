var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter;

var fsUtil = require('./util/fs.js');

var woods = new EventEmitter();
woods.express = require('express')();
woods.initialize = function (directory, port, watch, callback) {
	port = port || 3000;
	woods.express.listen(port);
	woods.url = 'http://localhost:' + port;
	var site = new Site(woods, directory, watch, callback);

	if (!watch) {
		require('./Site-sync');
	}
	return woods;
};

module.exports = woods;

var Site = require('./Site');
