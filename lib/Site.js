var watch = require('node-watch'),
	fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express');

	var liveReload = require('./live-reload.js'),
		fsUtil = require('./fs-util'),
		parsers = require('./parsers');

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var Site = function(param) {
	this.directory = param.directory;
	this.url = path.join('/', this.directory);
	woods.express.use(
		path.join(this.url, 'static'),
		express.static(this.getUri('assets'))
	);
	var site = this;
	loadParsers(this, function() {
		site.build();
		site.watchDirectory();
	});

	var regex = new RegExp(escapeRegExp(this.url) + '(.+)*');

	// Install the path in express:
	woods.express.get(regex, function(req, res, next) {
		var page = site.root.get(req.params.length && req.params[0]);
		if (page) {
			res.end(page.render('html'));
		} else {
			next();
		}
	});
};

Site.prototype.build = function() {
	// TODO: remove static routes
	this.types = {};
	this.templateLocations = {};
	this.root = new Page(this, null, '');
	this.addType('default');
};

// TODO: moving this to woods makes sense:
Site.prototype.watchDirectory = function() {
	var site = this,
		options = { recursive: true, followSymLinks: true };

	watch(this.getUri(), options, function(uri) {
		// Ignore hidden files:
		if((/^\./).test(path.basename(uri)))
			return;

		// TODO: if it is a jade file, just recompile the template

		// Just reload the page if only a static resource changed:
		console.log('File changed: ', uri);
		var ext = path.extname(uri);
		if (ext.length && !(/(md|jade)$/).test(ext)) {
			liveReload.changed();
		} else {
			// TODO: rebuild the Page instead of the whole site
			site.build();
			// TODO: setup build with a callback and call liveReload
			// when done. We're adding a small timeout here, because
			// we have yet to make this thing async.
			setTimeout(liveReload.changed, 30);
		}
	});
};

Site.prototype.getUri = function(file) {
	return path.resolve(woods.directory, this.directory, file || '');
};

Site.prototype.getTemplateDirectory = function(type) {
	return this.getUri(path.join('templates', type || ''));
};

Site.prototype.addType = function(type) {
	if (!this.types[type]) {
		// Check for templates belonging to type and install them
		// TODO: make async
		var typeTemplates = this.types[type] = {},
			templateLocations = this.templateLocations[type] = {},
			templatesDir = this.getTemplateDirectory(type);
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
