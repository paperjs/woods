module.exports = Site;

var fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express'),
	async = require('async'),
	marked = require('marked'),
	settings = require('./settings.json');

var fsUtil = require('./util/fs.js'),
	Parsers = require('./Parsers'),
	Helpers = require('./Helpers'),
	watchDirectory = require('./watchDirectory'),
	Page = require('./Page'),
	Thumbnails = require('./Thumbnails');

require('util').inherits(Site, require('events').EventEmitter);

var loadSettings = function(site, callback) {
	fs.readFile(site.getUri('settings.json'), 'utf8', function(err, content) {
		var data = (err) ? {} : JSON.parse(content);
		for (var key in data) {
			settings[key] = data[key];
		}
		// Set linebreaks setting
		marked.setOptions({
			breaks: settings.trueLinebreaks || false
		});
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
		// Language specific settings
		site.defaultLang = site.settings.defaultLanguage || 'en';
		site.availableLangs = site.settings.availableLanguages || [site.defaultLang];

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
		if (path.extname(file) == '.jade') {
			var templateName = path.basename(file, '.jade');
			var location = templateLocations[templateName] =
					path.join(templatesDir, file);
			fs.readFile(location, 'utf8', function(err, data) {
				if (!err) {
					try {
						typeTemplates[templateName] = jade.compile(data, {
							filename: location,
							pretty: true
						});
					} catch (e) {
						typeTemplates[templateName] = function() {
							return '<pre>Error compiling template: \n' + e;
						};
					}
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

Site.prototype.build = function(callback) {
	var site = this;
	site.pageCount = 0;
	// TODO: remove static routes
	site._types = {};
	site._templateLocations = {};
	site._addType('default', function(err) {
		if (err)
			return callback('Error: Default template missing');
		registerTemplates(site, function (err) {
			var newRoot = new Page(site, null, '', null, function(err) {
				site.modified = Date.now();
				if (site.availableLangs.length > 1) {
					relinkParents(newRoot);
				}
				site.root = newRoot;
				callback(err);
			});
		});
	});
};


function relinkParents(page) {
	page.children.each(function(child, i) {
		// Link to correct parent
		for (var lang in page.translatedCopies) {
			if (child.hasLang(lang)) {
				var parent = page.getLang(lang);
				child.getLang(lang).parent = parent;
				parent.children[i] = parent.children[child.slug] = child.getLang(lang);
			}
		}
		// Recursive
		if (child.hasChildren()) {
			relinkParents(child);
		}
	});
}

function registerTemplates(site, callback) {
	var uri = getTemplateDirectory(site);
	fsUtil.listDirectories(uri, function(err, files) {
		if (err || !files)
			return callback(err);
		async.each(files, function (file, cb) {
			site._addType(file, cb);
		}, callback);
	});
}

function getTemplateDirectory(site, type) {
	return site.getUri(path.join('templates', type || ''));
}

function escapeRegex(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

// Check if specific language was requested,
// else serve default
function handleLanguage(req, res, next, site) {
	var page, parts = req.params[0].slice(1).split('/'),
	availableLangs = site.availableLangs;

	if (parts.length > 1 && availableLangs.indexOf(parts[0]) != -1) {
		var requestedLang = parts[0];
		parts.shift();
		// This is the base page
		page = site.root.get('/' + parts.join('/'));
		// If a translated version of this page exists, return it
		if (page.hasLang(requestedLang)) {
			page = page.getLang(requestedLang);
		}
	} else {
		page = site.root.get(req.params[0]);
	}
	handleRequest(req, res, next, page);
}

function handleRequest(req, res, next, page) {
	if (page) {
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.end(page.template('html', {
			_activePage: page,
			request: req,
			query: req.query,
			number: req.params[1] && +req.params[1]
		}));
	} else {
		next();
	}
}

function installRoutes(site) {
	site.woods.express.use(
		'/assets',
		express.static(site.getUri('assets'))
	);

	site.woods.express.get(/^(.*?)([0-9]*)*?$/, function(req, res, next) {
		if (site.availableLangs) {
			handleLanguage(req, res, next, site);
		} else {
			handleRequest(req, res, next, site.root.get(req.params[0]));
		}
	});
}
