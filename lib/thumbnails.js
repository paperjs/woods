var hash = require('node_hash'),
	gm = require('gm'),
	path = require('path'),
	fs = require('fs'),
	async = require('async');

var File = require('./File'),
	thumbsByHash = {};

var gmQueue = async.queue(function (task, callback) {
	var resizer = gm(task.srcPath);
	if (task.width != this.width || task.height != this.height)
		resizer.resize(task.width, task.height);
	if (task.cropWidth || task.cropHeight) {
		resizer.crop(task.cropWidth, task.cropHeight).gravity(task.gravity);
	}
	resizer.autoOrient()
		.write(task.dstPath, function() {
			callback();
		});
}, 1);

function hashArguments() {
	return hash.md5(Array.prototype.slice.call(arguments).join(''));
}

File.prototype.exportThumb = function(param) {
	var width = param.width === undefined
			? param.height === undefined
				? this.width
				: Math.round((height / this.height) * this.width)
			: param.width;
	var height = param.height === undefined
			? param.width === undefined
				? this.height
				: Math.round((param.width / this.width) * this.height)
			: param.height;
	if ((param.maxWidth && width > param.maxWidth) || (param.maxHeight && height > param.maxHeight)) {
		var factor = width / height;
		if (maxWidth && width > maxWidth) {
			width = maxWidth;
			height = Math.round(width / factor);
		}
		if (maxHeight && height > maxHeight) {
			height = maxHeight;
			width = Math.round(height * factor);
		}
	}

	if (param.cropWidth || param.cropHeight) {
		if (param.cropWidth && !param.cropHeight)
			param.cropHeight = height;

		if (param.cropHeight && !param.cropWidth)
			param.cropWidth = width;
		if (width < param.cropWidth)
			param.cropWidth = width;
		if (height < param.cropHeight)
			param.cropHeight = height;

		if (!param.gravity)
			param.gravity = 'Center';
	}

	var file = this,
		site = this.page.site,
		hash = hashArguments(this.uri, this.size, width, height, param.cropWidth, param.cropHeight, param.gravity),
		name = hash + '.jpg',
		dstPath = path.join(site.getUri('assets/thumbnails'), name),
		exists = !!thumbsByHash[dstPath];
	if (!exists) {
		thumbsByHash[dstPath] = name;
		fs.exists(dstPath, function(exists) {
			if (!exists) {
				gmQueue.push({
					width: width,
					height: height,
					cropWidth: param.cropWidth,
					cropHeight: param.cropHeight,
					gravity: param.gravity,
					srcPath: file.uri,
					dstPath: dstPath
				});
			}
		});
	}
	return {
		url: path.join(site.url, 'assets/thumbnails', name),
		width: param.cropWidth || width,
		height: param.cropHeight || height
	};
};

File.prototype.thumb = function(param) {
	var info = this.exportThumb(param);
	return '<img src="' + info.url + '" width="' + info.width + '" height="' + info.height + '"></img>';
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