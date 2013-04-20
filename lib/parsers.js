var fs = require('fs'),
	util = require('./fs-util'),
	parsedown = require('woods-parsedown');

var parseContents = function(buffer, page) {
	var param = parsedown(buffer.toString());
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
			if (!err)
				parseContents(buffer, page);
			callback(err);
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
