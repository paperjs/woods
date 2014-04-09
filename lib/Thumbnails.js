var gm = require('./util/gm.js'),
	path = require('path'),
	fs = require('fs'),
	crypto = require('crypto'),
	async = require('async'),
	mkdirp = require('mkdirp'),
	util = require('util'),
	EventEmitter = require('events').EventEmitter;

var woods = require('./woods'),
	liveReload = require('./liveReload'),
	File = require('./File');

var exportGM = function (param, callback) {
	mkdirp(path.dirname(param.dstPath), function(err) {
		if (err)
			callback(err);
		var resizer = gm(param.srcPath);
		if (param.width != this.width || param.height != this.height)
			resizer.resize(param.width, param.height);
		if (param.cropWidth || param.cropHeight) {
			resizer.crop(param.cropWidth, param.cropHeight).gravity(param.gravity);
		}
		if (param.grayscale)
			resizer.type('grayscale');
		resizer.quality(param.quality || 90);
		resizer.autoOrient()
			.write(param.dstPath, function(err) {
				callback(err);
			});
	});
};

var gmQueue = async.queue(exportGM, 4);

function makeHash(file, param) {
	var parts = [
		file.uri,
		file.size,
		file.created,
		file.modified
	];
	for (var i in param)
		parts.push(param[i]);
	return crypto.createHash('md5').update(parts.join('_')).digest('hex');
}

File.prototype.exportThumb = function(param, _retina, _hashName) {
	var settings = {};
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
		site = this.site,
		thumbnails = file.site.thumbnails,
		extension = path.extname(file.uri),
		hash = (_hashName || makeHash(file, settings)),
		name = hash + (_retina ? '-2x' : '') + extension,
		dstPath = path.join(site.getUri('assets/thumbnails'), name || ''),
		exists = !!thumbnails.thumbsByHash[dstPath];
	if (!exists) {
		if (param.retina) {
			delete param.retina;
			file.exportThumb(param, true, hash);
		}

		thumbnails.thumbsByHash[dstPath] = name;
		fs.exists(dstPath, function(exists) {
			if (!exists) {
				thumbnails.queueLength++;
				thumbnails.queue.push({
					width: width,
					height: height,
					cropWidth: settings.cropWidth,
					cropHeight: settings.cropHeight,
					gravity: settings.gravity,
					srcPath: file.uri,
					dstPath: dstPath,
					quality: settings.quality,
					grayscale: settings.grayscale
				}, function(err) {
					thumbnails.queueLength--;
					if (err)
						console.log(err);
				});
			}
		});
	}
	return {
		url: '/assets/thumbnails/' + name,
		width: settings.cropWidth || width,
		height: settings.cropHeight || height
	};
};

File.prototype.thumb = function(param) {
	var info = this.exportThumb(param);
	return '<img src="' + info.url
		+ '" width="' + info.width
		+ '" height="' + info.height
		+ '"></img>';
};

woods.on('changed', function(site, uri, removed) {
	if (removed && (/\/(thumbnails)\//).test(uri)) {
		delete site.thumbnails.thumbsByHash[uri];
		liveReload.changedFile(uri);
	}
});

function Thumbnails(site) {
	var thumbnails = this;
	this.site = site;
	this.queueLength = 0;
	this.queue = async.queue(function(task, callback) {
		gmQueue.push(task, callback);
	}, 4);
	this.thumbsByHash = {};
	this.queue.drain = function() {
		thumbnails.emit('done');
	};
}

util.inherits(Thumbnails, EventEmitter);

module.exports = Thumbnails;
