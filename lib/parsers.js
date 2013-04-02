var fs = require('fs');
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
	var array = buffer.toString().split(/---+\n/);
	for (var i = 0; i < array.length; i++) {
		var matches = array[i].match(/^([^:]+)\:[\s]*([\s\S]+)/);
		if (matches && matches.length == 3) {
			var key = matches[1];
			var value = trim(matches[2]);
			// If there is a parser registered for this
			// property, have it take care of things.
			// Otherwise store the value directly on the
			// data property of the page.
			if (hasParser(key)) {
				getParser(key)(value, page);
			} else {
				page.data[key] = value;
			}
		}
	}
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

parsers.register('type', function(type, page) {
	page.data.type = type;
	page.site.addType(type);
});

parsers.register('date', function(string, page) {
	var parts = string.split('/'),
		date = new Date(+parts[2], +parts[0] - 1, +parts[1]);
	page.data.date = date;
	page.data.dateText = string;
});

parsers.register('tags', function(string, page) {
	// Split on commas surrounded by 0 or more spaces:
	var names = string.split(/\s*,\s*/g);
	if (!names.length)
		return;
	var site = page.site,
		siteTags = site.data.tags,
		pageTags = page.data.tags;
	if (!siteTags) siteTags = site.data.tags = [];
	if (!pageTags) pageTags = page.data.tags = [];
	names.forEach(function(name) {
		// Note: site.tags is being treated
		// as an object literal and array:
		var tag = siteTags[name];
		if (!tag) {
			tag = siteTags[name] = [];
			siteTags.push(tag);
		}
		tag.push(page);
		pageTags.push(tag);
	});
});

module.exports = parsers;
