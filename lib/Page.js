var path = require('path'),
	fs = require('fs'),
	express = require('express'),
	async = require('async');

var woods = require('./woods'),
	parsers = require('./parsers'),
	Site = require('./Site'),
	util = require('./fs-util'),
	TemplateParam = require('./TemplateParam'),
	File = require('./File');

var Page = function(site, parent, directory, index, callback) {
	site.pageCount++;
	this.site = site;
	this.directory = directory;
	this.name = parent ? directory.replace(/^[0-9]+-/g, '') : 'home';
	this.slug = parent ? this.name.replace(/\s/g, '-').toLowerCase() : '';
	this.files = [];
	this.images = [];
	this.documents = [];
	this.movies = [];
	this.sounds = [];
	this.parent = parent || null;
	if (parent) {
		parent.children[index] = this;
		parent.children[this.slug] = this;
	}

	// Only pages with a number prefixed to their
	// directory name are marked as being visible.
	this.visible = /^[0-9]/.test(this.directory);
	this.url = parent ? path.join(parent.url || '', this.slug) : site.url;
	this.uri = parent ? path.join(parent.uri || '', this.directory) : site.getUri('content');
	var page = this;
	addFiles(this, function(err) {
		if (err)
			return callback(err);

		addChildren(page, function(err) {
			// If the page has a content file, set its type based on 
			// the basename of its filename:
			if (!page._contentFile || err)
				return callback(err);
			page.type = path.basename(page._contentFile, '.md');
			page.site._addType(page.type, function(err) {
				if (err)
					return callback(err);
				// Parse the content file and place values in page:
				parsers.parse(page.getUri(page._contentFile), page, callback);
			});
		});
	});
};

Page.prototype._renderTemplate = function(name, param) {
	param = new TemplateParam(this, param);
	return getTemplate(this, name)(param);
};

Page.prototype.getUri = function(file) {
	return path.join(this.uri, file || '');
};

Page.prototype.getUrl = function(file) {
	return path.join(this.url, file || '');
};

/**
 * Get a page by a relative url.
 *
 * @return {Page}
 */
Page.prototype.get = function(url) {
	if (!url || !url.length)
		return this;

	var dirs = url.split('/'),
		page = url[0] == '/' ? this.site.root : this;
	dirs.forEach(function(dir) {
		if (!dir.length || !page)
			return;
		page = dir == '..' ? page.parent : page && page.children[dir];
	});
	return page;
};

/**
 * Checks whether this page has any children.
 *
 * @return {Boolean} {@true it is has one or more children}
 */
Page.prototype.hasChildren = function() {
	return this.children.length > 0;
};

/**
 * Returns the first child page of this page,
 * if any.
 * 
 * @return {Page}
 */
Page.prototype.getFirstChild = function() {
	return this.children.length && this.children[0];
};

/**
 * Returns the last child page of this page.
 * if any.
 * 
 * @return {Page}
 */
Page.prototype.getLastChild = function() {
	var length = this.children.length;
	return length && this.children[length - 1];
};

/**
 * Get an array of every nth child of this page.
 *
 * @return {Page[]}
 */
Page.prototype.nthChildren = function(n, offset) {
	var children = [];
	for (var i = offset || 0, l = this.children.length; i < l; i =+ n) {
		children.push(this.children[i]);
	}
	return children;
};

/**
 * Get the siblings of this page (includes the page itself).
 *
 * @return {Page[]}
 */
Page.prototype.getSiblings = function() {
	return this.parent.children;
};

/**
 * Checks whether the specified page is the parent of this page.
 *
 * @param {Item} page The page to check against
 * @return {Boolean} {@true if it is the parent of the page}
 */
Page.prototype.isParent = function(page) {
	return this.parent == page;
};

/**
 * Checks whether the specified page is a child of this page.
 *
 * @param {Item} page The page to check against
 * @return {Boolean} {@true it is a child of the page}
 */
Page.prototype.isChild = function(page) {
	return page && page.parent == this;
};

/**
 * Checks if this page is contained within the specified page
 * or one of its parents.
 *
 * @param {Item} page The page to check against
 * @return {Boolean} {@true if it is inside the specified page}
 */
Page.prototype.isDescendant = function(page) {
	var parent = this;
	while (parent = parent.parent) {
		if (parent == page)
			return true;
	}
	return false;
};

/**
 * Checks if the page is an ancestor of the specified page.
 *
 * @param {Item} page the page to check against
 * @return {Boolean} {@true if the page is an ancestor of the specified
 * page}
 */
Page.prototype.isAncestor = function(page) {
	return page ? page.isDescendant(this) : false;
};

/**
 * Checks whether there is a previous page on the same level as this one.
 *
 * @return {Boolean} {@true if the page is an ancestor of the specified
 * page}
 */
Page.prototype.hasPrevious = function() {
	return this.visible && this.index > 0;
};

/**
 * Checks whether there is a next page on the same level as this one.
 *
 * @return {Boolean}
 */
Page.prototype.hasNext = function() {
	return this.visible && this.index + 1 < this.parent.children.length;
};

/**
 * The previous page on the same level as this page.
 *
 * @return {Page}
 */
Page.prototype.getPrevious = function() {
	return this.hasPrevious() ? this.getSiblings()[this.index - 1] : null;
};

/**
 * The next page on the same level as this page.
 *
 * @return {Page}
 */
Page.prototype.getNext = function(page) {
	return this.hasNext() ? this.getSiblings()[this.index + 1] : null;
};

/**
 * Check whether this page has images.
 *
 * @return {Boolean}
 */
Page.prototype.hasImages = function(page) {
	return !!this.images.length;
};

/**
 * Check whether this page has files.
 *
 * @return {Boolean}
 */
Page.prototype.hasFiles = function(page) {
	return !!this.files.length;
};

function getTemplate(page, name) {
	var type = page.type,
		types = page.site._types;
	return type && types[type][name]
		? types[type][name]
		: types['default'][name] || function(param) {
			return 'Template not found: ' + name;
		};
}

function addFiles(page, done) {
	var uri = page.getUri(),
		images = page.images,
		files = page.files,
		index = 0;

	var addFile = function(fileName, callback) {
		if ((/md$/).test(fileName)) {
			page._contentFile = fileName;
			return callback();
		} else {
			var file = new File(page, index++, fileName, function(err) {
				if (err)
					return callback(err);
				page.files.push(file);
				if (file.type != 'other')
					page[file.type + 's'].push(file);
				return callback();
			});
		}
	};

	fs.exists(uri, function(exists) {
		if (!exists) return;
		var routeUrl = page.getUrl();
		woods.express.use(routeUrl, express.static(uri));
		util.listOnlyVisibleFiles(uri, function(err, files) {
			if (err)
				return done(err);
			async.eachSeries(files, addFile, done);
		});
	});
}

function addChildren(page, callback) {
	// Read the directory and add child pages (if any):
	var index = 0;
	util.listDirectories(page.uri, function(err, dirs) {
		if (!err) {
			var children = page.children = new Array(dirs.length);
			async.each(dirs, addChild, callback);
		} else {
			callback(err);
		}
	});

	var addChild = function(name, callback) {
		var file = path.resolve(page.uri, name),
			child = new Page(page.site, page, name, index++, callback);
	};
}

module.exports = Page;
