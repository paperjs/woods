var fs = require('fs'),
	async = require('async'),
	path = require('path'),
	EventEmitter = require('events').EventEmitter,
	express = require('express');

var fsUtil = require('./util/fs.js');

var woods = new EventEmitter();
woods.express = express();

woods.initialize = function (directory, port, watch, callback) {
	woods.export = !watch;
	var Site = require('./Site');

	port = port || 3000;

	woods.express.configure(function() {
		// FIXME: Hardcoded secret, move to settings.json, if undefined fill with random data.
		woods.express.use(session({secret: 'codsh-ay-hiet-jas-oj'}));
		woods.express.use(passport.initialize());
		woods.express.use(passport.session());
	});

	woods.express.listen(port);
	woods.url = 'http://localhost:' + port;
	var site = new Site(woods, directory, watch, callback);

	if (woods.export) {
		require('./siteSync');
	}
	return woods;
};

module.exports = woods;
