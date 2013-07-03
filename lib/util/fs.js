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

var util = {
	isVisible: function(file) {
		return !(/^\./).test(file);
	},

	listFiles: function(dir, callback, _callback) {
		// When listFiles is called by one of the other listing functions, these
		// can bass on their callback function as _callback, for direct routing
		// through of errors, without having to handle these on each level.
		_callback = _callback || callback;
		fs.exists(dir, function(exists) {
			if (!exists)
				return _callback();
			fs.readdir(dir, function(err, files) {
				if (err)
					return _callback(err);
				if (!files)
					return _callback();
				callback(null, files);
			});
		});
	},

	listDirectories: function(dir, callback, _callback) {
		util.listFiles(dir, function(err, files) {
			async.filter(files, createDirectoryFilter(dir), function(files) {
				callback(null, files);
			});
		}, _callback || callback);
	},

	listOnlyFiles: function(dir, callback, _callback) {
		util.listFiles(dir, function(err, files, _callback) {
			async.filter(files, createDirectoryFilter(dir, true), function(files) {
				callback(null, files);
			});
		}, _callback || callback);
	},

	listVisibleFiles: function(dir, callback, _callback) {
		util.listFiles(dir, function(err, files) {
			return callback(null, files.filter(util.isVisible));
		}, _callback || callback);
	},

	listOnlyVisibleFiles: function(dir, callback, _callback) {
		util.listOnlyFiles(dir, function(err, files) {
			return callback(null, files.filter(util.isVisible));
		}, _callback || callback);
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
	},

	isFile: function(uri, callback) {
		fs.stat(uri, function(err, stats) {
			callback(!err && stats && stats.isFile());
		});
	},

	isDirectory: function(uri, callback) {
		fs.stat(uri, function(err, stats) {
			if (err) throw err;
			callback(!err && stats && stats.isDirectory());
		});
	},

	recursiveDirectoryList: function(start, callback) {
		// Use lstat to resolve symlink if we are passed a symlink
		fs.lstat(start, function(err, stat) {
			if(err) {
				return callback(err);
			}
			var found = {dirs: [], files: []},
				total = 0,
				processed = 0;
			function isDir(abspath) {
				fs.stat(abspath, function(err, stat) {
					if(stat.isDirectory()) {
						found.dirs.push(abspath);
						// If we found a directory, recurse!
						util.recursiveDirectoryList(abspath, function(err, data) {
							found.dirs = found.dirs.concat(data.dirs);
							found.files = found.files.concat(data.files);
							if(++processed == total) {
								callback(null, found);
							}
						});
					} else {
						found.files.push(abspath);
						if(++processed == total) {
							callback(null, found);
						}
					}
				});
			}
			// Read through all the files in this directory
			if(stat.isDirectory()) {
				fs.readdir(start, function (err, files) {
					files = files.filter(util.isVisible);
					total = files.length;
					for(var x = 0, l = files.length; x < l; x++) {
						isDir(path.join(start, files[x]));
					}
					if (total === 0)
						callback(null, found);
				});
			} else {
				return callback(new Error("path: " + start + " is not a directory"));
			}
		});
	}
};

module.exports = util;

