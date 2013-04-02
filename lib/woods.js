var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	fsUtil = require('./fs-util');

var woods = module.exports = {
	express: require('express')(),
	directory: path.resolve(__dirname, '../sites/'),
	sites: []
};

var Site = require('./Site');

woods.express.locals.layout = false;
woods.express.listen(3000);

function initialize() {
	var addSites = function(dirs) {
		dirs.forEach(function(dir) {
			addSite(dir);
		});
	};

	var addSite = function(dir) {
		var site = new Site({
			directory: dir
		}, function(error) {
			if (error) {
				throw(error);
			} else {
				this.sites.push(site);
			}
		});
	};

	fsUtil.getDirectories(woods.directory, addSites);
}

initialize();