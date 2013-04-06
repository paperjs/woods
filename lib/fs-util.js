var fs = require('fs'),
	async = require('async'),
	path = require('path');

var createDirectoryFilter = function(dir) {
	return function(uri, callback) {
		fs.stat(path.resolve(dir, uri), function(err, stats) {
			callback(!!err || stats.isDirectory());
		});
	};
};

module.exports = {
	listDirectories: function(dir, callback) {
		fs.readdir(dir, function(err, files) {
			if (err)
				return callback(err);
			async.filter(files, createDirectoryFilter(dir), function(files) {
				callback(null, files);
			});
		});
	},

	listFiles: function(dir, callback) {
		fs.exists(dir, function(exists) {
			if (!exists)
				return callback();
			fs.readdir(dir, function(err, files) {
				if (err) {
					callback(err);
				} else {
					callback(null, files);
				}
			});
		});
	},
	readIfExists: function(file, callback) {
		fs.exists(file, function(exists) {
			if (exists) {
				fs.readFile(file, function(err, buffer) {
					callback(err, buffer);
				});
			} else {
				callback(new Error('File not found: ' + file));
			}
		});
	}
};