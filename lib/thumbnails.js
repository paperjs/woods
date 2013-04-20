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
	resizer.quality(task.quality || 90);
}, 1);

function makeHash(uri, param) {
	var string = '' + uri;
	for (var i in param)
		string += param[i];
	return hash.md5(string);
}

File.prototype.exportThumb = function(param, _retina, _hashName) {
	var settings = {},
		props = ['width', 'height', 'cropWidth', 'cropHeight', 'maxWidth', 'maxHeight', 'gravity', 'quality'];

	if (param) {
		for (var i in param)
			settings[i] = param[i];
	}

	var width = settings.width === undefined
			? settings.height === undefined
				? this.width
				: Math.round((height / this.height) * this.width)
			: settings.width;
	var height = settings.height === undefined
			? settings.width === undefined
				? this.height
				: Math.round((param.width / this.width) * this.height)
			: settings.height;
	if ((settings.maxWidth && width > settings.maxWidth) || (settings.maxHeight && height > settings.maxHeight)) {
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

	if (settings.cropWidth || settings.cropHeight) {
		if (settings.cropWidth && !settings.cropHeight)
			param.cropHeight = height;

		if (settings.cropHeight && !settings.cropWidth)
			param.cropWidth = width;
		if (width < settings.cropWidth)
			settings.cropWidth = width;
		if (height < settings.cropHeight)
			settings.cropHeight = height;

		if (!settings.gravity)
			settings.gravity = 'Center';
	}

	if (_retina) {
		width *= 2;
		height *= 2;
		if (settings.cropWidth)
			settings.cropWidth *= 2;
		if (settings.cropHeight)
			settings.cropHeight *= 2;
	}

	var file = this,
		site = this.page.site,
		extension = path.extname(this.uri),
		hash = (_hashName || makeHash(this.uri, settings)),
		name = hash + (_retina ? '-2x' : '') + extension,
		dstPath = path.join(site.getUri('assets/thumbnails'), name),
		exists = !!thumbsByHash[dstPath];
	if (!exists) {
		if (param.retina) {
			delete param.retina;
			this.exportThumb(param, true, hash);
		}

		thumbsByHash[dstPath] = name;
		fs.exists(dstPath, function(exists) {
			if (!exists) {
				gmQueue.push({
					width: width,
					height: height,
					cropWidth: settings.cropWidth,
					cropHeight: settings.cropHeight,
					gravity: settings.gravity,
					srcPath: file.uri,
					dstPath: dstPath,
					quality: settings.quality
				});
			}
		});
	}
	return {
		url: path.join(site.url, 'assets/thumbnails', name),
		width: settings.cropWidth || width,
		height: settings.cropHeight || height
	};
};

File.prototype.thumb = function(param) {
	var info = this.exportThumb(param);
	return '<img src="' + info.url + '" width="' + info.width + '" height="' + info.height + '"></img>';
};

module.exports = {
	checkCache: function(uri) {
		fs.exists(uri, function(exists) {
			if (!exists)
				delete thumbsByHash[uri];
		});
	}
};