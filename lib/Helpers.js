var fs = require('fs'),
	path = require('path'),
	needless = require('needless');

var fsUtil = require('./util/fs.js'),
	woods = require('./woods'),
	TemplateParam = require('./TemplateParam');

var Helpers = function(site) {
	this.site = site;
	this.uri = site.getUri('helpers');
};

function loadFile(file) {
	// Remove any require cache first, using https://github.com/PPvG/node-needless:
	needless(file);
	var module = require(file);
	for (var key in module) {
		TemplateParam.prototype[key] = module[key];
	}
}

Helpers.prototype = {
	load: function(callback) {
		var uri = this.uri;
		fsUtil.listFiles(uri, function(err, files) {
			if (!files)
				return callback();
			files.filter(fsUtil.isVisible).forEach(function(file) {
				loadFile(path.join(uri, file));
			});
			if (callback)
				callback();
		});
	}
};

module.exports = Helpers;