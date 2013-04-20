var fs = require('fs'),
	fsUtil = require('./fs-util'),
	parsedown = require('woods-parsedown'),
	path = require('path'),
	needless = require('needless');

var Parsers = function(site) {
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
};

Parsers.prototype.has = function(key) {
	return !!this.dictionary[key];
};

Parsers.prototype.get = function(key) {
	return this.dictionary[key];
};

Parsers.prototype.removeByFile = function(file) {
	var keys = this.keysByFile[file];
	if (!keys)
		return;
	for (var i = 0; i < keys.length; i++) {
		delete this.dictionary[keys[i]];
	}
	delete this.keysByFile[file];
};

Parsers.prototype.removeByKey = function(key) {
	delete this.dictionary[key];
};

Parsers.prototype.load = function(file) {
	// Remove any require cache first, using https://github.com/PPvG/node-needless:
	needless(file);
	var module = require(file);
	for (var name in module)
		this.register(name, module[name]);
};

Parsers.prototype.loadAll = function(callback) {
	var parsers = this,
		uri = this.uri;
	fsUtil.listOnlyVisibleFiles(uri, function(err, files) {
		if (!files)
			return callback();
		files.forEach(function(file) {
			parsers.load(path.join(uri, file));
		});
		if (callback)
			callback();
	});
};

Parsers.prototype.parse = function(string, page) {
	var param = parsedown(string),
		parsers = this;
	for (var key in param) {
		var value = param[key];
		if (parsers.has(key)) {
			parsers.get(key)(value, page);
		} else {
			page[key] = value;
		}
	}
	// Fallback to page.name for page.title:
	page.title = page.title || page.name;
};

Parsers.prototype.parseFile = function(file, page, callback) {
	var parsers = this;
	fsUtil.readIfExists(file, function(err, buffer) {
		if (!err)
			parsers.parse(buffer.toString(), page);
		callback(err);
	});
};

Parsers.prototype.register = function(name, parser) {
	this.dictionary[name] = parser;
};

module.exports = Parsers;