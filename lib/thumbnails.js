var hash = require('node_hash'),
	gm = require('gm'),
	path = require('path'),
	fs = require('fs'),
	async = require('async');

var File = require('./File'),
	thumbsByHash = {};

var gmQueue = async.queue(function (task, callback) {
	gm(task.inputUri)
		.resize(task.width, task.height)
		.autoOrient()
		.write(task.outputUri, function() {
			callback();
		});
}, 1);

function hashArguments() {
	return hash.md5(Array.prototype.slice.call(arguments).join(''));
}

File.prototype.exportThumb = function(width, height) {
	width = width === undefined
			? height === undefined
				? this.width
				: Math.round((height / this.height) * this.width)
			: width;
	height = height === undefined
			? width === undefined
				? this.height
				: Math.round((width / this.width) * this.height)
			: height;
	var file = this,
		site = this.page.site,
		hash = hashArguments(this.uri, this.size, width, height),
		name = hash + this.extension,
		outputUri = path.join(site.getUri('assets/thumbnails'), name),
		exists = !!thumbsByHash[outputUri];
	if (!exists) {
		thumbsByHash[outputUri] = name;
		fs.exists(outputUri, function(exists) {
			if (!exists) {
				gmQueue.push({
					width: width,
					height: height,
					inputUri: file.uri,
					outputUri: outputUri
				});
			}
		});
	}
	return path.join(site.url, 'assets/thumbnails', name);
};

File.prototype.thumb = function(width, height) {
	width = width === undefined
			? height === undefined
				? this.width
				: Math.round((height / this.height) * this.width)
			: width;
	height = height === undefined
			? width === undefined
				? this.height
				: Math.round((width / this.width) * this.height)
			: height;
	var url = this.exportThumb(width, height);
	return '<img src="' + url + '" width="' + width + '" height="' + height + '"></img>';
};

module.exports = {
	checkCache: function(uri) {
		fs.exists(uri, function(exists) {
			if (!exists) {
				delete thumbsByHash[uri];
			}
		});
	}
};