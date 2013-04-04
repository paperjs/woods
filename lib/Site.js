var watch = require('node-watch'),
	fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express');

	var liveReload = require('./live-reload.js'),
		fsUtil = require('./fs-util'),
		parsers = require('./parsers');

var Site = function(param) {
	this.directory = param.directory;
	this.url = path.join('/', this.directory);
	this.data = {};
	woods.express.use(
		path.join(this.url, 'static'),
		express.static(param.assets || this.getUri('resources'))
	);
	var that = this;
	loadParsers(this, function() {
		that.build();
		that.watchDirectory();
	});
};

Site.prototype.build = function() {
	// TODO: remove static routes
	if (this.pageByUrl) {
		for (var i in this.pageByUrl) {
			removeRoute(i);
		}
	}
	this.pageByUrl = {};
	this.types = {};
	this.templateLocations = {};
	this.root = new Page(this, null, '');
	this.addType('default');
};

// TODO: moving this to woods makes sense:
Site.prototype.watchDirectory = function() {
	var directory = path.resolve(woods.directory, this.directory);
	var that = this;

	// Checks if any of the folders up the tree of the file
	// is called resources:
	var isResource = function(uri) {
		return (/\/resources\//).test(uri);
	};

	var options = { recursive: true, followSymLinks: true };
	watch(directory, options, function(uri) {
		// Ignore hidden files:
		if((/^\./).test(path.basename(uri)))
			return;
		if (isResource(uri)) {
			liveReload.changed();
		} else {
			// TODO: rebuild the Page instead of the whole site
			that.build();
			// TODO: setup build with a callback and call liveReload
			// when done
			setTimeout(liveReload.changed, 30);
		}
	});
};

Site.prototype.getPageByUrl = function(url) {
	return this.pageByUrl[path.join(this.url, url || '')];
};

Site.prototype.getUri = function(file) {
	return path.resolve(woods.directory, this.directory, file || '');
};

Site.prototype.getTemplateUri = function(type) {
	return this.getUri(path.join('templates', type || ''));
};

Site.prototype.addType = function(type) {
	if (!this.types[type]) {
		// Check for templates belonging to type and install them
		// TODO: make async
		var typeTemplates = this.types[type] = {},
			templateLocations = this.templateLocations[type] = {},
			templatesDir = this.getTemplateUri(type);
		// TODO: make async
		if (!fs.existsSync(templatesDir))
			return;
		var files = fs.readdirSync(templatesDir);
		files.forEach(function(file) {
			if ((/jade$/).test(file)) {
				var templateName = path.basename(file, '.jade');
				var location = templateLocations[templateName] =
						path.join(templatesDir, file);
				compileTemplate(location, function(renderer) {
					typeTemplates[templateName] = renderer;
				});
			}
		});
	}
};

// TODO: make parsers editable
function loadParsers(site, callback) {
	var uri = site.getUri('parsers');
	fsUtil.listFiles(uri, function(err, files) {
		if (!files)
			return callback();
		files.forEach(function(file) {
			var parser = require(path.join(uri, file)),
				name = path.basename(file, '.js');
			parsers.register(name, parser);
		});
		callback();
	});
}


function compileTemplate(path, callback) {
	fs.readFile(path, 'utf-8', function(err, data) {
		if (err) throw err;
		callback(jade.compile(data));
	});
}

function removeRoute(route) {
	var routes = woods.express.routes;
	for (var i in routes.get) {
		if (routes.get[i].path + '' === route + '') {
			routes.get.splice(i, 1);
			break;
		}
	}
}

var Page = require('./Page'),
	woods = require('./woods');

module.exports = Site;
