module.exports = Site;

var fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express'),
	parsedown = require('woods-parsedown');

var fsUtil = require('./fs-util'),
	Parsers = require('./Parsers'),
	thumbnails = require('./thumbnails'),
	watchDirectory = require('./watchDirectory'),
	Page = require('./Page');

require('util').inherits(Site, require('events').EventEmitter);

var loadSettings = function(site, callback) {
	fsUtil.readIfExists(site.getUri('settings.md'), function(err, data) {
		site.settings = err ? {} : parsedown(data);
		callback();
	});
};

function Site(woods, directory, callback) {
	this.woods = woods;
	this.directory = directory;
	this.url = path.join('/', this.directory);
	this.parsers = new Parsers(this);
	watchDirectory(this);
	installRoutes(this);
	var site = this;
	loadSettings(this, function() {
		site.parsers.loadAll(function() {
			site.build(callback);
		});
	});
}

Site.prototype.getUri = function(file) {
	return path.resolve(this.woods.directory, this.directory, file || '');
};

Site.prototype._addType = function(type, callback) {
	if (this._types[type])
		return callback();

	// Check for templates belonging to type and install them
	var typeTemplates = this._types[type] = {},
		templateLocations = this._templateLocations[type] = {},
		templatesDir = getTemplateDirectory(this, type);

	var compileTemplate = function(file, doneCompiling) {
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

	fsUtil.listOnlyVisibleFiles(templatesDir, function(err, files) {
		if (err || !files)
			return callback(err);
		async.each(files, compileTemplate, callback);
	});
};

// TODO: what happens if this function is called while 
// the site is already being built?
Site.prototype.build = function(callback) {
	var site = this;
	site.pageCount = 0;
	// TODO: remove static routes
	site._types = {};
	site._templateLocations = {};
	site._addType('default', function(err) {
		if (err)
			return callback(err);
		site.root = new Page(site, null, '', null, function(err) {
			site.modified = Date.now();
			callback(err);
		});
	});
};

function getTemplateDirectory(site, type) {
	return site.getUri(path.join('templates', type || ''));
}

function escapeRegex(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

function installRoutes(site) {
	site.woods.express.use(
		path.join(site.url, 'assets'),
		express.static(site.getUri('assets'))
	);

	var regex = new RegExp(escapeRegex(site.url) + '(.+)*');
	// Install the path in express:
	site.woods.express.get(regex, function(req, res, next) {
		var then = new Date(),
			page = site.root.get(req.params.length && req.params[0]);
		if (page) {
			res.end(page._renderTemplate('html', {
				_activePage: page,
				request: req,
				query: req.query
			}));
			console.log('Serving ', req.url, 'took', new Date() - then);
		} else {
			next();
		}
	});
}
