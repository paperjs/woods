var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	fsUtil = require('./fs-util');

var woods = module.exports = {
	express: require('express')(),
	sites: []
};

var Site = require('./Site');

function initialize(directory, port, callback) {
	woods.directory = directory;
	port = port || 3000;
	woods.express.listen(port);
	fsUtil.listDirectories(woods.directory, function(err, dirs) {
		if (err)
			console.error(err);
		dirs.forEach(function(dir) {
			var site = new Site({directory: dir}, function(err) {
				if (err) {
					if (callback) {
						return callback(err);
					} else {
						console.error(err);
					}
				}
				woods.sites.push(site);
				console.log('Serving', path.join(woods.directory, dir), 'on http://localhost:' + port + site.url);
				if (callback)
					return callback(err);
			});
		});
	});
	return woods;
}

module.exports = initialize;