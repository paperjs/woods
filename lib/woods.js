var EventEmitter = require('events').EventEmitter;

var woods = new EventEmitter();
woods.express = require('express')();

woods.initialize = function (directory, port, watch, callback) {
	woods.export = !watch;
	var Site = require('./Site');

	port = port || 3000;
	woods.express.listen(port);
	woods.url = 'http://localhost:' + port;
	var site = new Site(woods, directory, watch, callback);

	if (woods.export) {
		require('./siteSync');
	}
	return woods;
};

module.exports = woods;
