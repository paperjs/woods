var watch = require('watch'),
	fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express'),
	liveReload = require('./live-reload.js');

var Site = function(param) {
	this.directory = param.directory;
	this.url = path.join('/', this.directory);
	woods.express.use(
		path.join(this.url, 'static'),
		express.static(param.assets || this.getUri('resources'))
	);
	this.build();
	this.watchDirectory();
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
	var watch = require('watch');
	var that = this;
	watch.watchTree(directory, function (f, curr, prev) {
		// Finished walking the tree:
		if (typeof f == "object" && prev === null && curr === null)
			return;
		var then = new Date();
		// TODO: rebuild the Page instead of the whole site
		// TODO: ignore changes in static directories?
		that.build();
		// TODO: setup build with a callback and call liveReload
		// when done
		setTimeout(liveReload.changed, 30);
		console.log('Rebuilding took', new Date() - then);
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
