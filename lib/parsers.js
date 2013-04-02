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

var Cromag = require('Cromag');
parsers.register('date', function(dateString, page) {
	if (!dateString)
		return;
	var ms = Cromag.parse(dateString, 'dd/MM/y');
	page.data.ms = ms;
	page.data.date = new Cromag(ms);
});

module.exports = parsers;