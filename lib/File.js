var path = require('path'),
	mime = require('mime'),
	fs = require('fs');

var File = function(page, index, fileName, callback) {
	this.index = index;
	this.page = page;
	this.fileName = fileName;
	this.uri = page.getUri(fileName);

	// The file extension includes a leading .
	this.extension = path.extname(fileName);

	// The name of the file without extension:
	this.name = path.basename(fileName, this.extension);
	this.mime = mime.lookup(fileName);
	this.type = getType(this.extension);
	var file = this;
	fs.stat(this.uri, function(err, stats) {
		if (err)
			return callback(err);
		file.size = stats.size;
		file.humanSize = humanFileSize(stats.size);
		return callback();
	});
};

/**
 * Get the url of the file.
 *
 * @return {File[]}
 */
File.prototype.getUrl = function() {
	return this.page.getUrl(this.fileName);
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
		+ ['B', 'kB', 'MB', 'GB', 'TB'][i];
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
