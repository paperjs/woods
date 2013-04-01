var fs = require('fs');
var tags = {};

var trim = function(string) {
	return string.replace(/^\s+|\s+$/g, '');
};

var parseContents = function(buffer, branch, callback) {
	var array = buffer.toString().split(/---+\n/);
	for (var i = 0; i < array.length; i++) {
		var matches = array[i].match(/^([^:]+)\:[\s]*([\s\S]+)/);
		if (matches && matches.length == 3) {
			var key = matches[1];
			var value = trim(matches[2]);
			if (leaves.has(key)) {
				leaves.get(key)(value, branch);
			} else {
				branch.data[key] = value;
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

var leaves = {
	parse: function(file, branch, callback) {
		readIfExists(file, function(err, buffer) {
			if (!err)
				parseContents(buffer, branch, callback);
		});
	},

	has: function(name) {
		return !!tags[name];
	},

	get: function(name) {
		return tags[name];
	},

	register: function(name, parse) {
		tags[name] = parse;
	}
};

leaves.register('type', function(type, branch) {
	branch.data.type = type;
	branch.tree.addType(type);
});


// leaves.register('tags', function(text, branch) {
// 	if (!text)
// 		return;
// 	var names = text.split(/\,[\s]+/g);
// 	var tree = branch.tree;
// 	if (!tree.tags)
// 		tree.tags = {};
// 	if (!branch.data.tags)
// 		branch.data.tags = {};

// 	for (var i = 0, l = names.length; i < l; i++) {
// 		var name = names[i];
// 		var tag = tree.tags[name];
// 		if (!tag)
// 			tag = tree.tags[name] = new Tag(name);
// 		tag.add(branch);
// 		branch.data.tags[name] = tag;
// 	}
// });

var Cromag = require('Cromag');
leaves.register('date', function(dateString, branch) {
	if (!dateString)
		return;
	var ms = Cromag.parse(dateString, 'dd/MM/y');
	branch.data.ms = ms;
	branch.data.date = new Cromag(ms);
});

module.exports = leaves;