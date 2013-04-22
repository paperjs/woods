var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter;

var fsUtil = require('./fs-util');

var woods = new EventEmitter();
woods.express = require('express')();
woods.sites = [];
woods.initialize = function (directory, port, callback) {
	woods.directory = directory;
	port = port || 3000;
	woods.express.listen(port);
	woods.url = 'http://localhost:' + port;
	fsUtil.listDirectories(woods.directory, function(err, dirs) {
		var sitesDone = 0;
		if (err)
			console.error(err);
		dirs.forEach(function(dir) {
			var site = new Site(woods, dir, function(err) {
				woods.sites.push(site);
				woods.sites[dir] = site;
				sitesDone++;
				if (sitesDone == dirs.length && callback)
					return callback(err);
			});
		});
	});
	return woods;
};

module.exports = woods;

var Site = require('./Site');
require('./Site-sync');