var path = require('path'),
	fs = require('fs'),
	express = require('express'),
	async = require('async'),
	request = require('superagent'),
	slug = require('slugg'),
	sort = require('natural-compare-lite');

var woods = require('./woods'),
	Site = require('./Site'),
	fsUtil = require('./util/fs.js'),
	TemplateParam = require('./TemplateParam'),
	File = require('./File'),
	Collection = require('./Collection');

function Page(site, parent, directory, index, callback) {
	site.pageCount++;
	this.site = site;
	this.directory = directory;
	this.name = parent ? directory.replace(/^\d+[\.-]/g, '') : 'home';
	this.slug = parent ? slug(this.name) : '';

	this.files = new Collection();
	this.images = new Collection();
	this.documents = new Collection();
	this.movies = new Collection();
	this.sounds = new Collection();
	this.parent = parent || null;
	if (parent) {
		parent.children[index] = this;
		parent.children[this.slug] = this;
		this.index = index;
	}

	// Only pages with a number prefixed to their
	// directory name are marked as being visible.
	this.visible = /^[0-9]/.test(this.directory);
	this.url = parent ? path.join(parent.url || '', this.slug + '/') : '/';
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
			page.type = path.basename(page._contentFile, site.settings.contentExtension);
			page.site._addType(page.type, function(err) {
				if (err)
					return callback(err);
				// Parse the content file and place values in page:
				site.parsers.parseFile(page.getUri(page._contentFile), page, callback);
			});
		});
	});
}

Page.prototype = {
	href: function(action) {
		return woods.url +  path.join(this.url, action || '');
	},

	template: function(name, param) {
		var templateParam = new TemplateParam(this, param);
		return getTemplate(this, name)(templateParam);
	},

	getUri: function(file) {
		return path.join(this.uri, file || '');
	},

	getUrl: function(file) {
		return path.join(this.url, file || '');
	},

	/**
	 * Get a page by a relative url.
	 *
	 * @return {Page}
	 */
	get: function(url) {
		if (!url || !url.length)
			return this;

		var dirs = url.split('/'),
			page = url[0] == '/' ? this.site.root : this;
		dirs.forEach(function(dir) {
			if (!dir.length || !page)
				return;
			page = dir == '..' ? page && page.parent : page && page.children && page.children[dir];
		});
		return page;
	},

	getHtml: function(callback) {
		request
			.get(this.href())
			.buffer()
			.end(function(err, res) {
				callback(err, res.text)
			});
	},

	/**
	 * Checks whether this page has any children.
	 *
	 * @return {Boolean} {@true it is has one or more children}
	 */
	hasChildren: function() {
		return this.children.length > 0;
	},

	/**
	 * Returns the first child page of this page,
	 * if any.
	 * 
	 * @return {Page}
	 */
	getFirstChild: function() {
		return this.children.length && this.children[0];
	},

	/**
	 * Returns the last child page of this page.
	 * if any.
	 * 
	 * @return {Page}
	 */
	getLastChild: function() {
		var length = this.children.length;
		return length && this.children[length - 1];
	},

	/**
	 * Get an array of every nth child of this page.
	 *
	 * @return {Page[]}
	 */
	nthChildren: function(n, offset) {
		var children = [];
		for (var i = offset || 0, l = this.children.length; i < l; i =+ n) {
			children.push(this.children[i]);
		}
		return children;
	},

	/**
	 * Get the siblings of this page (includes the page itself).
	 *
	 * @return {Page[]}
	 */
	getSiblings: function() {
		return this.parent.children;
	},

	/**
	 * Checks whether the specified page is the parent of this page.
	 *
	 * @param {Item} page The page to check against
	 * @return {Boolean} {@true if it is the parent of the page}
	 */
	isParent: function(page) {
		return this.parent == page;
	},

	/**
	 * Checks whether the specified page is a child of this page.
	 *
	 * @param {Item} page The page to check against
	 * @return {Boolean} {@true it is a child of the page}
	 */
	isChild: function(page) {
		return page && page.parent == this;
	},

	/**
	 * Checks if this page is contained within the specified page
	 * or one of its parents.
	 *
	 * @param {Item} page The page to check against
	 * @return {Boolean} {@true if it is inside the specified page}
	 */
	isDescendant: function(page) {
		var parent = this;
		while (parent = parent.parent) {
			if (parent == page)
				return true;
		}
		return false;
	},

	/**
	 * Checks if the page is an ancestor of the specified page.
	 *
	 * @param {Item} page the page to check against
	 * @return {Boolean} {@true if the page is an ancestor of the specified
	 * page}
	 */
	isAncestor: function(page) {
		return page ? page.isDescendant(this) : false;
	},

	/**
	 * Checks whether there is a previous page on the same level as this one.
	 *
	 * @return {Boolean} {@true if the page is an ancestor of the specified
	 * page}
	 */
	hasPrevious: function() {
		return this.visible && this.index > 0;
	},

	/**
	 * Checks whether there is a next page on the same level as this one.
	 *
	 * @return {Boolean}
	 */
	hasNext: function() {
		return this.visible && this.index + 1 < this.parent.children.length;
	},

	/**
	 * The previous page on the same level as this page.
	 *
	 * @return {Page}
	 */
	getPrevious: function() {
		return this.hasPrevious() ? this.getSiblings()[this.index - 1] : null;
	},

	/**
	 * The next page on the same level as this page.
	 *
	 * @return {Page}
	 */
	getNext: function(page) {
		return this.hasNext() ? this.getSiblings()[this.index + 1] : null;
	},

	/**
	 * Check whether this page has images.
	 *
	 * @return {Boolean}
	 */
	hasImages: function(page) {
		return !!this.images.length;
	},

	/**
	 * Check whether this page has files.
	 *
	 * @return {Boolean}
	 */
	hasFiles: function(page) {
		return !!this.files.length;
	}
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
		index = 0,
		contentExtension = page.site.settings.contentExtension;

	var addFile = function(filename, callback) {
		if (path.extname(filename) == contentExtension) {
			page._contentFile = filename;
			return callback();
		} else {
			var file = new File(page, index++, filename, function(err) {
				if (err)
					return callback(err);
				page.files.push(file);
				page.files[file.filename] = file;
				if (file.type != 'other') {
					var collection = page[file.type + 's'];
					collection.push(file);
					collection[filename] = file;
				}
				return callback();
			});
		}
	};

	fs.exists(uri, function(exists) {
		if (!exists) return;
		var routeUrl = page.getUrl();
		woods.express.use(routeUrl, express.static(uri));
		fsUtil.listOnlyVisibleFiles(uri, function(err, files) {
			if (err)
				return done(err);
			async.eachSeries(files, addFile, done);
		});
	});
}

function addChildren(page, callback) {
	// Read the directory and add child pages (if any):
	var index = 0;
	var addChild = function(name, callback) {
		new Page(page.site, page, name, index++, callback);
	};
	fsUtil.listDirectories(page.uri, function(err, dirs) {
		if (err) {
			return callback(err);
		}
		if (page.site.settings.naturalSort) {
			dirs.sort(String.naturalCompare);
		}
		page.children = new Collection(new Array(dirs.length));
		async.each(dirs, addChild, callback);
	});
}

module.exports = Page;
