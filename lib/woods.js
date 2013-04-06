var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	fsUtil = require('./fs-util');

var woods = module.exports = {
	express: require('express')(),
	// TODO: allow custom sites location
	directory: path.resolve(__dirname, '../sites/'),
	sites: []
};

var Site = require('./Site'),
	port = 3000;

// TODO: allow setting of port through cli args
woods.express.listen(port);

function initialize() {
	fsUtil.listDirectories(woods.directory, function(err, dirs) {
		if (err)
			console.error(err);
		dirs.forEach(function(dir) {
			// TODO: allow custom assets location
			var site = new Site({directory: dir}, function(err) {
				if (err)
					console.error(err);
				woods.sites.push(site);
				console.log('Serving http://localhost:' + port + site.url);
			});
		});
	});
}

initialize();