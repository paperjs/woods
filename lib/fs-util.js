var fs = require('fs'),
	async = require('async'),
	path = require('path');

var createDirectoryCheck = function(dir) {
	return function(uri, callback) {
		fs.stat(path.resolve(dir, uri), function(err, stats) {
			callback(!!err || stats.isDirectory());
		});
	};
};

module.exports = {
	getDirectories: function(dir, callback) {
		var files = fs.readdirSync(dir);
		async.filter(files, createDirectoryCheck(dir), callback);
	}
};