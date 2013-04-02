var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	fsUtil = require('./fs-util');

var woods = module.exports = {
	express: require('express')(),
	directory: path.resolve(__dirname, '../sites/'),
	trees: []
};

var Tree = require('./Tree');

woods.express.locals.layout = false;
woods.express.listen(3000);

function initialize() {
	var addTrees = function(dirs) {
		dirs.forEach(function(dir) {
			addTree(dir);
		});
	};

	var addTree = function(dir) {
		var tree = new Tree({
			directory: dir
		}, function(error) {
			if (error) {
				throw(error);
			} else {
				this.trees.push(tree);
			}
		});
	};

	fsUtil.getDirectories(woods.directory, addTrees);
}

initialize();