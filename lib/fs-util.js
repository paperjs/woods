var fs = require('fs'),
	async = require('async'),
	path = require('path');

var createDirectoryFilter = function(dir, invert) {
	return function(uri, callback) {
		fs.stat(path.resolve(dir, uri), function(err, stats) {
			var isDirectory = !!err || stats.isDirectory();
			callback(invert ? !isDirectory : isDirectory);
		});
	};
};

var fileIsVisible = function(file) {
	return !(/^\./).test(file);
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

	listOnlyFiles: function(dir, callback) {
		fs.exists(dir, function(exists) {
			if (!exists)
				return callback();
			fs.readdir(dir, function(err, files) {
				async.filter(files, createDirectoryFilter(dir, true), function(files) {
					callback(null, files);
				});
			});
		});
	},

	listFiles: function(dir, callback) {
		fs.exists(dir, function(exists) {
			if (!exists)
				return callback();
			fs.readdir(dir, function(err, files) {
				callback(null, files);
			});
		});
	},

	listOnlyVisibleFiles: function(dir, callback) {
		var that = this;
		this.listFiles(dir, function(err, files) {
			if (err)
				return callback(err);
			that.listOnlyFiles(dir, function(err, files) {
				if (!files)
					return callback();
				var visible = files.filter(fileIsVisible);
				return callback(null, visible);
			});
		});
	},

	readIfExists: function(file, callback) {
		fs.exists(file, function(exists) {
			if (exists) {
				fs.readFile(file, 'utf8', function(err, buffer) {
					callback(err, buffer);
				});
			} else {
				callback(new Error('File not found: ' + file));
			}
		});
	}
};