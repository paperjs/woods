var watch = require('node-watch'),
	fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express'),
	async = require('async');

	var liveReload = require('./live-reload.js'),
		fsUtil = require('./fs-util'),
		parsers = require('./parsers');

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var Site = function(param, callback) {
	this.directory = param.directory;
	this.url = path.join('/', this.directory);
	installRoutes(this);
	var site = this;
	loadParsers(site, function() {
		site.build(function(err) {
			callback(err);
			site.watchDirectory();
		});
	});
};

Site.prototype.build = function(callback) {
	this.pageCount = 0;
	// TODO: remove static routes
	this.types = {};
	this.templateLocations = {};
	var site = this;
	this.addType('default', function(err) {
		if (err)
			return callback(err);
		site.root = new Page(site, null, '', null, callback);
	});
};

Site.prototype.watchDirectory = function() {
	var site = this,
		options = { recursive: true, followSymLinks: true },
		changes = [],
		timeoutId;
	var changed = function(uri) {
		// ignore hidden files
		if ((/^\./).test(path.basename(uri)))
			return;

		if ((/\/assets\//).test(uri))
			return liveReload.changed(path.relative(woods.directory, uri));

		if (timeoutId)
			clearTimeout(timeoutId);

		changes.push(uri);

		// Make the timeout longer by the amount of filesystem changes:
		var timeoutTime = 10 * changes.length + 30;

		timeoutId = setTimeout(function() {
			var then = new Date();
			// TODO: go through changes array instead and apply individual changes
			// instead of rebuilding the whole site?
			site.build(function() {
				console.log('Rebuilt', site.pageCount, 'pages in', new Date() - then);
				liveReload.changed();
			});
			changes.length = 0;
		}, timeoutTime);
	};
	watch(this.getUri(), options, changed);
};

Site.prototype.getUri = function(file) {
	return path.resolve(woods.directory, this.directory, file || '');
};

Site.prototype.getTemplateDirectory = function(type) {
	return this.getUri(path.join('templates', type || ''));
};

Site.prototype.addType = function(type, callback) {
	if (this.types[type])
		return callback();
	// Check for templates belonging to type and install them
	var typeTemplates = this.types[type] = {},
		templateLocations = this.templateLocations[type] = {},
		templatesDir = this.getTemplateDirectory(type);

	var compile = function(file, doneCompiling) {
		// Compile jade templates:
		if ((/jade$/).test(file)) {
			var templateName = path.basename(file, '.jade');
			var location = templateLocations[templateName] =
					path.join(templatesDir, file);
			fs.readFile(location, 'utf-8', function(err, data) {
				if (!err)
					typeTemplates[templateName] = jade.compile(data);
				return doneCompiling(err);
			});
		} else {
			return doneCompiling();
		}
	};
	fsUtil.listFiles(templatesDir, function(err, files) {
		if (err || !files)
			return callback(err);
		async.each(files, compile, callback);
	});
};

function installRoutes(site) {
	woods.express.use(
		path.join(site.url, 'static'),
		express.static(site.getUri('assets'))
	);

	var regex = new RegExp(escapeRegExp(site.url) + '(.+)*');
	// Install the path in express:
	woods.express.get(regex, function(req, res, next) {
		var then = new Date(),
			page = site.root.get(req.params.length && req.params[0]);
		if (page) {
			res.end(page.render('html'));
			console.log('Serving ', req.url, 'took', new Date() - then);
		} else {
			next();
		}
	});
}

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
