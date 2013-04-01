var watch = require('watch'),
	fs = require('fs'),
	path = require('path'),
	jade = require('jade'),
	express = require('express');

function compileTemplate(path, callback) {
	fs.readFile(path, 'utf-8', function(err, data) {
		if (err) throw err;
		callback(jade.compile(data));
	});
}

function removeRoute(route) {
	var routes = woods.express.routes;
	for (var i in routes.get) {
		if (routes.get[i].path + '' === route + '') {
			routes.get.splice(i, 1);
			break;
		}
	}
}

var Tree = function(param) {
	this.directory = param.directory;
	woods.express.use(
		this.getUrl() + 'static/',
		express.static(param.assets || this.getUri('assets/'))
	);
	this.build();
	this.watchDirectory();
};

Tree.prototype.build = function() {
	if (this.branchByUrl) {
		for (var i in this.branchByUrl) {
			removeRoute(i);
		}
	}
	this.branchByUrl = {};
	this.types = {};
	this.templateLocations = {};
	this.root = new Branch(this, null, '');
	this.addType('default');
};

// TODO: moving this to woods makes sense:
Tree.prototype.watchDirectory = function() {
	var directory = path.resolve(woods.directory, this.directory);
	var watch = require('watch');
	var that = this;
	watch.watchTree(directory, function (f, curr, prev) {
		// Finished walking the tree:
		if (typeof f == "object" && prev === null && curr === null)
			return;
		var then = new Date();
		that.build();
		console.log(new Date());
		console.log('Rebuilding took', new Date() - then);
	});
};

Tree.prototype.getBranchByUrl = function(url) {
	return this.branchByUrl[path.normalize(this.getUrl() + url)];
};

Tree.prototype.getUrl = function() {
	return '/' + this.directory;
};

Tree.prototype.getUri = function(subfolder) {
	return path.resolve(woods.directory, this.directory, subfolder || '');
};

Tree.prototype.getTemplateUri = function(type) {
	return this.getUri('templates/' + (type ? type + '/' : ''));
};

Tree.prototype.addType = function(type) {
	if (!this.types[type]) {
		// Check for templates belonging to type and install them
		// TODO: make async
		var typeTemplates = this.types[type] = {},
			templateLocations = this.templateLocations[type] = {},
			templatesDir = this.getTemplateUri(type);
		if (!fs.existsSync(templatesDir))
			return;
		var files = fs.readdirSync(templatesDir);
		files.forEach(function(file) {
			if ((/jade$/).test(file)) {
				var templateName = path.basename(file, '.jade');
				var location = templateLocations[templateName] =
						path.join(templatesDir, file);
				compileTemplate(location, function(renderer) {
					typeTemplates[templateName] = renderer;
				});
			}
		});
	}
};

var Branch = require('./Branch'),
	woods = require('./woods');

module.exports = Tree;
