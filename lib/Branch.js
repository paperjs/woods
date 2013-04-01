var path = require('path'),
	fs = require('fs'),
	leaves = require('./leaves'),
	woods = require('./woods'),
	Tree = require('./Tree'),
	Showdown = require('showdown'),
	converter = new Showdown.converter(),
	express = require('express');

var Branch = function(tree, parent, directory) {
	var that = this;
	this.tree = tree;
	if (parent)
		this.parent = parent;
	this.directory = directory;
	// Remove the numbers in the path, since they are only used for order:
	this.urlPath = this.getUrl()
		.replace(/\/[0-9]+\-/g, '/')
		.replace(/\s/g, '-');
	tree.branchByUrl[this.urlPath] = this;
	this.name = this.directory == ''
			? 'root'
			: path.basename(this.urlPath).replace(/\/$/, '');

	installRoute(this);
	addChildren(this);
	addResources(this);
	parseContent(this);
};

Branch.prototype.getTemplate = function(name) {
	console.log(name);
	var type = this.data.type,
		types = this.tree.types;
	return type && types[type][name]
		? types[type][name]
		: types['default'][name] || function(param) {
			return 'Template not found: ' + name;
		};
};

Branch.prototype.getTemplateLocation = function(name) {
	var templateLocations = this.tree.templateLocations,
		type = this.data.type;
	return this.data.type && templateLocations[type][name]
		? templateLocations[type][name]
		: templateLocations['default'][name];
};

Branch.prototype.renderTemplate = function(name) {
	return this.getTemplate(name)({
		branch: this,
		parse: function(content, param) {
			return converter.makeHtml(content);
		}
	});
};

Branch.prototype.getUri = function(url) {
	var uri = this.directory,
		parent = this.parent;
	while (parent) {
		uri = path.join(parent.directory, uri);
		parent = parent.parent;
	}
	var tree = url ? this.tree.getUrl() : this.tree.getUri('content');
	var resolved = path.resolve(tree, uri);
	return resolved;
};

Branch.prototype.getUrl = function() {
	if (!this._url)
		this._url = this.getUri(true).replace(/\/[0-9]+-/g,'/')
				.replace(/\s/g, '-');
	return this._url;
};

var reservedNames = {resources: true, error: true, home: true};
Branch.nameIsReserved = function(name) {
	return !!name && !!reservedNames[name];
};

var addResources = function(branch) {
	var routeUrl = path.join(branch.getUrl(), 'resources'),
		resourcesDir = path.join(branch.getUri(), 'resources'),
		images = branch.images = [],
		resources = branch.resources = [];

	console.log('Adding static route:', routeUrl);

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

var addChildren = function(branch) {
	// Read the directory and add child branches (if any):
	var children = branch.children = [];
	var uri = branch.getUri();
	var files = fs.readdirSync(uri);
	var index = 0;
	for (var i in files) {
		var file = path.resolve(uri, files[i]);
		var name = path.basename(file);
		var isDirectory = fs.statSync(file).isDirectory();
		if (isDirectory && !Branch.nameIsReserved(name)) {
			var isChild = /^[0-9]+\-/.test(name);
			var childBranch = new Branch(branch.tree, branch, path.relative(uri, file));
			childBranch.index = index++;
			// Only add to children list if it is a child
			// - i.e. its name starts in the style of: 01- or 02-
			if (isChild)
				children.push(childBranch);
		}
	}
};

var parseContent = function(branch) {
	// Parse the content file and place values in branch.data:
	branch.data = {};
	var contentPath = branch.getUri() + '/content.md';
	leaves.parse(contentPath, branch);
};

var installRoute = function(branch) {
	// Install the path in express:
	woods.express.get(branch.urlPath, function(req, res) {
		var template = branch.getTemplateLocation('html');
		res.render(template, {
			title: branch.data.title,
			text: branch.data.text || '',
			base: branch.tree.getUrl(),
			branch: branch,
			parse: function(content, param) {
				return converter.makeHtml(content);
			},
			bodyTemplate: 'body'
		});
	});
};

module.exports = Branch;