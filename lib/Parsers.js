var fs = require('fs'),
	parsedown = require('woods-parsedown'),
	path = require('path'),
	needless = require('needless');

var fsUtil = require('./util/fs.js'),
	woods = require('./woods');

function Parsers(site) {
	this.site = site;
	this.uri = site.getUri('parsers');
	this.dictionary = {};
	this.keysByFile = {};
	// Parse date properties:
	this.register('date', function(string, page) {
		var parts = string.split('/'),
			date = new Date(+parts[2], +parts[0] - 1, +parts[1]);
		page.date = date;
		page.dateText = string;
	});

	var parsers = this;
	site.on('changed', function(uri, removed) {
		if ((/\/(parsers)\//).test(uri)) {
			site.dirty = true;
			if (removed) {
				parsers.removeByKey(uri);
			} else {
				fsUtil.isFile(uri, function(isFile) {
					if (isFile) {
						parsers.load(uri);
					} else {
						parsers.loadAll();
					}
				});	
			}
		}
	});
}

Parsers.prototype = {
	has: function(key) {
		return !!this.dictionary[key];
	},

	get: function(key) {
		return this.dictionary[key];
	},

	removeByFile: function(file) {
		var keys = this.keysByFile[file];
		if (!keys)
			return;
		for (var i = 0; i < keys.length; i++) {
			delete this.dictionary[keys[i]];
		}
		delete this.keysByFile[file];
	},

	removeByKey: function(key) {
		delete this.dictionary[key];
	},

	loadFile: function(file) {
		// Remove any parsers that were previously created by this file:
		this.removeByFile(file);
		// Remove any require cache first, using https://github.com/PPvG/node-needless:
		needless(file);
		var module = require(file);
		var keysByFile = this.keysByFile[file] = [];
		for (var key in module) {
			keysByFile.push(key);
			this.register(key, module[key]);
		}
	},

	load: function(callback) {
		var parsers = this,
			uri = this.uri;
		fsUtil.listOnlyVisibleFiles(uri, function(err, files) {
			if (!files)
				return callback();
			files.forEach(function(file) {
				parsers.loadFile(path.join(uri, file));
			});
			if (callback)
				callback();
		});
	},

	parse: function(string, page) {
		page.raw = string;
		var param = parsedown(string),
			parsers = this;
		for (var key in param) {
			var value = param[key];
			if (parsers.has(key)) {
				parsers.get(key)(value, page);
			} else {
				// Do not override existing properties:
				if (!page[key])
					page[key] = value;
			}
		}
		// Fallback to page.name for page.title:
		page.title = page.title || page.name;
	},

	parseFile: function(file, page, callback) {
		var parsers = this;
		fs.readFile(file, 'utf8', function(err, buffer) {
			if (!err)
				parsers.parse(buffer.toString(), page);
			callback(err);
		});
	},

	register: function(name, parser) {
		this.dictionary[name] = parser;
	}
};

module.exports = Parsers;
