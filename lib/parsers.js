var fs = require('fs'),
	yamlFront = require('yaml-front-matter');

var dictionary = {};

var trim = function(string) {
	return string.replace(/^\s+|\s+$/g, '');
};

var hasParser = function(key) {
	return !!dictionary[key];
};

var getParser = function(key) {
	return dictionary[key];
};

var parseContents = function(buffer, page, callback) {
	var results = yamlFront.loadFront(buffer);
	if (!results)
		results = { content: buffer.toString() };
	for (var key in results) {
		var value = results[key];
		if (hasParser(key)) {
			getParser(key)(value, page);
		} else {
			page[key == '__content' ? 'content' : key] = value;
		}
	}
	// Fallback to page.name for page.title:
	page.title = page.title || page.name;
};

var readIfExists = function(file, callback) {
	fs.stat(file, function(err, stats) {
		if (stats) {
			fs.readFile(file, function(err, buffer) {
				callback(null, buffer);
			});
		} else {
			callback(new Error('File not found: ' + file));
		}
	});
};

var parsers = {
	parse: function(file, page, callback) {
		readIfExists(file, function(err, buffer) {
			if (!err)
				parseContents(buffer, page, callback);
		});
	},

	register: function(name, parse) {
		dictionary[name] = parse;
	}
};

parsers.register('date', function(string, page) {
	var parts = string.split('/'),
		date = new Date(+parts[2], +parts[0] - 1, +parts[1]);
	page.date = date;
	page.dateText = string;
});

module.exports = parsers;
