module.exports = Site;

var fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express'),
	async = require('async'),
	parsedown = require('woods-parsedown'),
	settings = require('./settings');

var fsUtil = require('./util/fs.js'),
	Parsers = require('./Parsers'),
	Helpers = require('./Helpers'),
	watchDirectory = require('./watchDirectory'),
	Page = require('./Page'),
	Thumbnails = require('./Thumbnails');

require('util').inherits(Site, require('events').EventEmitter);

var loadSettings = function(site, callback) {
	fs.readFile(site.getUri('settings.md'), 'utf8', function(err, content) {
		var data = (err) ? {} : parsedown(content);
		for (var key in data) {
			settings[key] = data[key];
		}
		site.settings = settings;
		callback();
	});
};

function Site(woods, directory, watch, callback) {
	this.woods = woods;
	woods.site = this;
	this.directory = directory;
	this.parsers = new Parsers(this);
	this.helpers = new Helpers(this);
	this.thumbnails = new Thumbnails(this);
	if (watch)
		watchDirectory(this);
	installRoutes(this);
	var site = this;
	loadSettings(this, function() {
		site.parsers.load(function() {
			site.helpers.load(function() {
				site.build(callback);
			});
		});
	});
}

Site.prototype.getUri = function(file) {
	return path.resolve(this.directory, file || '');
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
				if (!err) {
					typeTemplates[templateName] = jade.compile(data, {
						filename: location,
						pretty: true
					});
				}
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
		var newRoot = new Page(site, null, '', null, function(err) {
			site.modified = Date.now();
			site.root = newRoot;
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
		'/assets',
		express.static(site.getUri('assets'))
	);

	site.woods.express.get(/^(.*?)([0-9]*)*?$/, function(req, res, next) {
		var then = new Date(),
			page = site.root.get(req.params[0]);
		if (page) {
			res.setHeader('Content-Type', 'text/html; charset=utf-8')
			res.end(page.template('html', {
				_activePage: page,
				request: req,
				query: req.query,
				number: req.params[1] && +req.params[1]
			}));
		} else {
			next();
		}
	});
}
