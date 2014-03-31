var path = require('path'),
	mime = require('mime'),
	fs = require('fs'),
	gm = require('gm'),
	async = require('async');

function File(page, index, filename, callback) {
	this.index = index;
	this.page = page;
	this.site = page.site;
	this.filename = filename;
	this.uri = page.getUri(filename);
	this.url = page.getUrl(filename);

	// The file extension includes a leading .
	this.extension = path.extname(filename);

	// The name of the file without extension:
	this.name = path.basename(filename, this.extension);
	this.mime = mime.lookup(filename);
	this.type = getType(this.extension);
	var file = this;
	// TODO: find a way to cache these values
	var setFileProperties = function(callback) {
		fs.stat(file.uri, function(err, stats) {
			if (err)
				return callback(err);
			file.size = stats.size;
			file.humanSize = humanFileSize(stats.size);
			file.created = stats.ctime;
			file.modified = stats.mtime;
			return callback();
		});
	};
	var setDescription = function(callback) {
		fs.readFile(file.uri + page.site.settings.contentExtension, 'utf8', function(err, content) {
			if (err)
				file.description = null;
			else
				file.description = content;
			return callback();
		});
	};
	var setDimensions = function(callback) {
		if (file.type == 'image') {
			gm(file.uri)
			.size(function (err, size) {
				if (err)
					return callback(err);
				file.width = size.width;
				file.height = size.height;
				file.landscape = file.width > file.height;
				file.portrait = file.height > file.width;
				file.dimensions = size;
				callback();
			});
		} else {
			callback();
		}
	};
	async.parallel([setFileProperties, setDimensions, setDescription], callback);
}

/**
 * Get the html needed to embed this file. Currently only
 * images are supported. If only a width or a height is
 * provided, the other is calculated automatically.
 * 
 * @param {Number} [width]
 * @param {Number} [height]
 * @return {String}
 */
File.prototype.html = function(param) {
	if (!param)
		param = {};
	var width = param.width === undefined
			? param.height === undefined
				? this.width
				: Math.round((param.height / this.height) * this.width)
			: width;
	var height = param.height === undefined
			? param.width === undefined
				? this.height
				: Math.round((param.width / this.width) * this.height)
			: height;
	if (this.type == 'image') {
		return '<img '
			+ (param.imageClass ? 'class="' + param.imageClass + '" ' : '')
			+ (param.imageId ? 'id="' + param.imageId + '" ' : '')
			+ 'src="' + this.url
			+ '" width="' + width
			+ '" height="'
			+ height + '"></img>';
	} else {
		return '<a href="' + this.getUrl() + '">' + this.filename + '</a>';
	}
};

/**
 * Get the siblings of this file (includes the file itself).
 *
 * @return {File[]}
 */
File.prototype.getSiblings = function() {
	return this.page.files;
};

/**
 * Get the siblings of this file (includes the file itself).
 *
 * @return {File[]}
 */
File.prototype.getSibling = function(index) {
	return this.getSiblings()[index];
};

/**
 * Checks whether there is a previous file on the same level as this one.
 *
 * @return {Boolean} {@true if the file is an ancestor of the specified
 * file}
 */
File.prototype.hasPrevious = function() {
	return this.index > 0;
};

/**
 * Checks whether there is a next file on the same level as this one.
 *
 * @return {Boolean}
 */
File.prototype.hasNext = function() {
	return this.index + 1 < this.getSiblings().length;
};

/**
 * The next file on the same level as this file.
 *
 * @return {File}
 */
File.prototype.getNext = function(page) {
	return this.hasNext() ? this.getSibling(this.index + 1) : null;
};

/**
 * The previous file on the same level as this file.
 *
 * @return {File}
 */
File.prototype.getPrevious = function() {
	return this.hasPrevious() ? this.getSibling(this.index - 1) : null;
};

// Taken from the comments of: http://programanddesign.com/js/human-readable-file-size-in-javascript/
function humanFileSize(size) {
	var i = Math.floor( Math.log(size) / Math.log(1024) );
	return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' '
		+ ['B', 'KB', 'MB', 'GB', 'TB'][i];
}

function getType(extension) {
	switch (extension) {
		case '.jpg':
		case '.jpeg':
		case '.gif':
		case '.png':
			return 'image';
		case '.pdf':
		case '.doc':
		case '.txt':
		case '.xls':
		case '.ppt':
		case '.zip':
		case '.html':
		case '.css':
			return 'document';
		case '.mov':
		case '.mp4':
		case '.mpg':
		case '.swf':
		case '.ogg':
		case '.webm':
		case '.flv':
		case '.avi':
			return 'movie';
		case '.mp3':
		case '.wav':
		case '.aiff':
			return 'sound';
		default:
			return 'other';
	}
}

module.exports = File;
