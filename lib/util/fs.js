var fs = require('fs'),
	async = require('async'),
	path = require('path');

// We need to sort files alphanumerically since on linux the file sequence is
// not specified.
function sortFiles(files) {
	files.sort(function(a, b) {
		return a < b ? -1 : 1;
	});
	return files;
}

function isVisible(file) {
	return !(/^\./).test(file);
}

function listFiles(dir, callback, _callback) {
	// When listFiles is called by one of the other listing functions, these
	// can bass on their callback function as _callback, for direct routing
	// through of errors, without having to handle these on each level.
	_callback = _callback || callback;
	fs.readdir(dir, function(err, files) {
		if (!files || err)
			return _callback(err);
		callback(null, sortFiles(files));
	});
}

function listFiltred(dir, directories, callback, _callback) {
	listFiles(dir, function(err, files) {
		async.filter(files, function(uri, callback) {
			fs.stat(path.resolve(dir, uri), function(err, stats) {
				var isDirectory = !!err || stats.isDirectory();
				callback(directories ? isDirectory : !isDirectory);
			});
		}, function(files) {
			callback(null, files);
		});
	}, _callback || callback);
}

var util = {
	isVisible: isVisible,
	listFiles: listFiles,

	listDirectories: function(dir, callback, _callback) {
		listFiltred(dir, true, callback, _callback);
	},

	listOnlyFiles: function(dir, callback, _callback) {
		listFiltred(dir, false, callback, _callback);
	},

	listVisibleFiles: function(dir, callback, _callback) {
		listFiles(dir, function(err, files) {
			return callback(null, files.filter(isVisible));
		}, _callback || callback);
	},

	listOnlyVisibleFiles: function(dir, callback, _callback) {
		util.listOnlyFiles(dir, function(err, files) {
			return callback(null, files.filter(isVisible));
		}, _callback || callback);
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
					files = files.filter(isVisible);
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
