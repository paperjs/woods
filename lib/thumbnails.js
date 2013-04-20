var hash = require('node_hash'),
	gm = require('gm'),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	mkdirp = require('mkdirp');

var woods = require('./woods'),
	liveReload = require('./live-reload'),
	File = require('./File');

var thumbsByHash = {};

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
		resizer.autoOrient()
			.write(param.dstPath, function(err) {
				callback(err);
			});
		resizer.quality(param.quality || 90);
	});
};

var GMQueue = async.queue(exportGM, 1);

function makeHash(uri, param) {
	var string = '' + uri;
	for (var i in param)
		string += param[i];
	return hash.md5(string);
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
				GMQueue.push({
					width: width,
					height: height,
					cropWidth: settings.cropWidth,
					cropHeight: settings.cropHeight,
					gravity: settings.gravity,
					srcPath: file.uri,
					dstPath: dstPath,
					quality: settings.quality
				}, function(err) {
					if (err)
						console.log(err);
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

woods.on('changed', function(site, uri, removed) {
	if (removed && (/\/(thumbnails)\//).test(uri)) {
		delete thumbsByHash[uri];
		liveReload.changedFile(uri);
	}
});
