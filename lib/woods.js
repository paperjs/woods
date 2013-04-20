var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	fsUtil = require('./fs-util'),
	EventEmitter = require('events').EventEmitter;

var woods = new EventEmitter();
woods.express = require('express')();
woods.sites = [];
woods.initialize = function (directory, port, callback) {
	woods.directory = directory;
	port = port || 3000;
	woods.express.listen(port);
	fsUtil.listDirectories(woods.directory, function(err, dirs) {
		if (err)
			console.error(err);
		dirs.forEach(function(dir) {
			var site = new Site(woods, dir, function(err) {
				if (err) {
					if (callback) {
						return callback(err);
					} else {
						console.error(err);
					}
				}
				woods.sites.push(site);
				console.log('Serving', path.join(woods.directory, dir), 'on http://localhost:' + port + site.url);
				if (callback)
					return callback(err);
			});
		});
	});
	return woods;
};

module.exports = woods;

var Site = require('./Site');