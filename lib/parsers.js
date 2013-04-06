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
			// page.
			if (hasParser(key)) {
				getParser(key)(value, page);
			} else {
				page[key] = value;
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
	page.type = type;
	page.site.addType(type);
});

parsers.register('date', function(string, page) {
	var parts = string.split('/'),
		date = new Date(+parts[2], +parts[0] - 1, +parts[1]);
	page.date = date;
	page.dateText = string;
});

module.exports = parsers;
