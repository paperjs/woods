var path = require('path'),
	fs = require('fs'),
	Showdown = require('showdown'),
	markdown = new Showdown.converter().makeHtml,
	express = require('express');

var woods = require('./woods'),
	parsers = require('./parsers'),
	Site = require('./Site');

// Helper function to get the uri or url of the page
var getUri = function(page, url) {
	var uri = '',
		parent = page;
	while (parent) {
		uri = path.join(url ? parent.slug : parent.directory, uri);
		parent = parent.parent;
	}
	var site = url ? page.site.url : page.site.getUri('content');
	return path.join(site, uri);
};

var Page = function(site, parent, directory) {
	this.site = site;
	this.directory = directory;
	this.name = !parent ? 'home' : directory.replace(/^[0-9]+-/g,'');
	this.slug = !parent ? '' : this.name.replace(/\s/g, '-').toLowerCase();
	this.images = [];
	this.resources = [];
	this.parent = parent || null;
	// Only pages with a number prefixed to their
	// directory name are marked as being visible.
	this.visible = /^[0-9]/.test(this.directory);

	this.url = getUri(this, true);
	this.uri = getUri(this);
	site.pageByUrl[this.url] = this;

	installRoute(this);
	addChildren(this);
	addResources(this);
	parseContent(this);
};

Page.prototype.getTemplate = function(name) {
	var type = this.type,
		types = this.site.types;
	return type && types[type][name]
		? types[type][name]
		: types['default'][name] || function(param) {
			return 'Template not found: ' + name;
		};
};

Page.prototype.getTemplateLocation = function(name) {
	var templateLocations = this.site.templateLocations,
		type = this.type;
	return this.type && templateLocations[type][name]
		? templateLocations[type][name]
		: templateLocations['default'][name];
};

Page.prototype.renderTemplate = function(name) {
	var param = getTemplateParam(this);
	return this.getTemplate(name)(param);
};

Page.prototype.getUri = function(file) {
	return path.join(this.uri, file || '');
};

Page.prototype.getUrl = function(file) {
	return path.join(this.url, file || '');
};

Page.prototype.getResourceUrl = function(file) {
	return file && path.join(this.url, 'resources', file);
};

/**
 * The title of the page as defined in its document
 * or, when not defined, the name of its folder.
 *
 * @return {String}
 */
Page.prototype.getTitle = function() {
	return this.title || this.name;
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
Page.prototype.getFirstChild = function() {
	var length = this.children.length;
	return length && this.children[length - 1];
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

/**
 * Check whether this page has images.
 *
 * @return {Boolean}
 */
Page.prototype.hasImages = function(page) {
	return !!this.images.length;
};

/**
 * Check whether this page has resources.
 *
 * @return {Boolean}
 */
Page.prototype.hasResources = function(page) {
	return !!this.resources.length;
};

var getTemplateParam = function(page) {
	return {
		page: page,
		site: page.site,
		markdown: markdown
	};
};

var addResources = function(page) {
	var resourcesDir = page.getUri('resources'),
		images = page.images,
		resources = page.resources;

	var addFile = function(file) {
		if (/jpg|jpeg|png|gif/.test(file)) {
			images.push(file);
		}
		resources.push(file);
	};

	fs.exists(resourcesDir, function(exists) {
		if (!exists) return;
		var routeUrl = page.getUrl('resources');
		woods.express.use(routeUrl, express.static(resourcesDir));
		fs.readdir(resourcesDir, function(err, files) {
			files.forEach(addFile);
		});
	});
};

var addChildren = function(page) {
	// Read the directory and add child pages (if any):
	var children = page.children = [],
		// TODO: make async:
		files = fs.readdirSync(page.uri),
		index = 0;
	for (var i in files) {
		var name = files[i],
			file = path.resolve(page.uri, name),
			// TODO: make async:
			isDirectory = fs.statSync(file).isDirectory(),
			nameReserved = /^(resources|error)$/.test(name);
		if (isDirectory && !nameReserved) {
			var child = new Page(page.site, page, name);
			// Only add to children list if it is a child
			// - i.e. its name starts in the style of: 01- or 02-
			children.push(child);
			children[child.slug] = child;
			child.index = index++;
		}
	}
};

var parseContent = function(page) {
	// Parse the content file and place values in page:
	parsers.parse(page.getUri('content.md'), page);
};

var installRoute = function(page) {
	// Install the path in express:
	woods.express.get(page.url, function(req, res) {
		var template = page.getTemplateLocation('html');
		var param = getTemplateParam(page);
		res.render(template, param);
	});
};

module.exports = Page;
