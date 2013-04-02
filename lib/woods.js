var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	fsUtil = require('./fs-util');

var woods = module.exports = {
	express: require('express')(),
	// TODO: allow custom sites location
	directory: path.resolve(__dirname, '../sites/'),
	sites: []
};

var Site = require('./Site');

// TODO: allow setting of port through cli args
woods.express.listen(3000);

function initialize() {
	var addSites = function(dirs) {
		dirs.forEach(function(dir) {
			// TODO: allow custom assets location
			var site = new Site({directory: dir});
			woods.sites.push(site);
		});
	};

	fsUtil.getDirectories(woods.directory, addSites);
}

initialize();