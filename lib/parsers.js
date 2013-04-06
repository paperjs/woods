var fs = require('fs'),
	yamlFront = require('yaml-front-matter'),
	util = require('./fs-util');

var parseContents = function(buffer, page, callback) {
	var results = yamlFront.loadFront(buffer);
	if (!results)
		results = { content: buffer.toString() };
	for (var key in results) {
		var value = results[key];
		if (parsers.has(key)) {
			parsers.get(key)(value, page);
		} else {
			// Use page.content instead of the __content yaml-front-matter provides
			page[key == '__content' ? 'content' : key] = value;
		}
	}
	// Fallback to page.name for page.title:
	page.title = page.title || page.name;
};

var parsers = {
	dictionary: {},
	has: function(key) {
		return !!this.dictionary[key];
	},

	get: function(key) {
		return this.dictionary[key];
	},

	parse: function(file, page, callback) {
		util.readIfExists(file, function(err, buffer) {
			if (err) {
				console.log(err);
			} else {
				parseContents(buffer, page, callback);
			}
		});
	},

	register: function(name, parse) {
		this.dictionary[name] = parse;
	}
};

// Parse date properties:
parsers.register('date', function(string, page) {
	var parts = string.split('/'),
		date = new Date(+parts[2], +parts[0] - 1, +parts[1]);
	page.date = date;
	page.dateText = string;
});

module.exports = parsers;
