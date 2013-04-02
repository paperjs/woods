var path = require('path'),
	fs = require('fs'),
	parsers = require('./parsers'),
	woods = require('./woods'),
	Site = require('./Site'),
	Showdown = require('showdown'),
	converter = new Showdown.converter(),
	express = require('express');

var Page = function(site, parent, directory) {
	var that = this;
	this.site = site;
	if (parent)
		this.parent = parent;
	this.directory = directory;
	this.data = {};

	var uri = this.getUri(true);

	// Only pages with a number prefixed to their
	// directory name are marked as being visible.
	this.visible = /^\/[0-9]/.test(uri);

	// Remove numbers in path, since they are only used for order,
	// and replace spaces by dashes:
	this.url = uri.replace(/\/[0-9]+-/g,'/')
				.replace(/\s/g, '-');

	site.pageByUrl[this.url] = this;
	this.name = this.directory == ''
			? 'home'
			: path.basename(this.url).replace(/\/$/, '');

	installRoute(this);
	addChildren(this);
	addResources(this);
	parseContent(this);
};

Page.prototype.getTemplate = function(name) {
	var type = this.data.type,
		types = this.site.types;
	return type && types[type][name]
		? types[type][name]
		: types['default'][name] || function(param) {
			return 'Template not found: ' + name;
		};
};

Page.prototype.getTemplateLocation = function(name) {
	var templateLocations = this.site.templateLocations,
		type = this.data.type;
	return this.data.type && templateLocations[type][name]
		? templateLocations[type][name]
		: templateLocations['default'][name];
};

Page.prototype.renderTemplate = function(name) {
	return this.getTemplate(name)({
		page: this,
		parse: function(content, param) {
			return converter.makeHtml(content);
		}
	});
};

Page.prototype.getUri = function(url) {
	var uri = this.directory,
		parent = this.parent;
	while (parent) {
		uri = path.join(parent.directory, uri);
		parent = parent.parent;
	}
	var site = url ? this.site.url : this.site.getUri('content');
	var resolved = path.resolve(site, uri);
	return resolved;
};

/**
 * The title of the page as defined in its document
 * or, when not defined, the name of its folder.
 *
 * @return {String}
 */
Page.prototype.getTitle = function() {
	return this.data.title || this.name;
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
	return this.hasPrevious() ? this.parent.children[this.index - 1] : null;
};

/**
 * The next page on the same level as this page.
 *
 * @return {Page}
 */
Page.prototype.getNext = function(page) {
	return this.hasNext() ? this.parent.children[this.index + 1] : null;
};

var addResources = function(page) {
	var routeUrl = path.join(page.url, 'resources'),
		resourcesDir = path.join(page.getUri(), 'resources'),
		images = page.images = [],
		resources = page.resources = [];

	woods.express.use(routeUrl, express.static(resourcesDir));

	var addFile = function(file) {
		if (/jpg|jpeg|png|gif/.test(file)) {
			images.push(file);
		} else {
			resources.push(file);
		}
	};

	var addFiles = function() {
		fs.readdir(resourcesDir, function(err, files) {
			files.forEach(addFile);
		});
	};

	fs.exists(resourcesDir, function(err, exists) {
		if (!exists) return;
		addFiles();
	});
};

var addChildren = function(page) {
	// Read the directory and add child pagees (if any):
	var children = page.children = [],
		uri = page.getUri(),
		// TODO: make async:
		files = fs.readdirSync(uri),
		index = 0;
	for (var i in files) {
		var name = files[i],
			file = path.resolve(uri, name),
			// TODO: make async:
			isDirectory = fs.statSync(file).isDirectory(),
			nameReserved = /^(resources|error)$/.test(name);
		if (isDirectory && !nameReserved) {
			var child = new Page(page.site, page, name);
			// Only add to children list if it is a child
			// - i.e. its name starts in the style of: 01- or 02-
			children.push(child);
			child.index = index++;
		}
	}
};

var parseContent = function(page) {
	// Parse the content file and place values in page.data:
	var contentPath = path.join(page.getUri(), 'content.md');
	parsers.parse(contentPath, page);
};

var installRoute = function(page) {
	// Install the path in express:
	woods.express.get(page.url, function(req, res) {
		var template = page.getTemplateLocation('html');
		res.render(template, {
			site: page.site,
			page: page,
			parse: function(content, param) {
				return converter.makeHtml(content);
			}
		});
	});
};

module.exports = Page;
