var tinylr = require('tiny-lr'),
	request = require('superagent'),
	path = require('path'),
	woods = require('./woods');

// standard LiveReload port
var port = 35729,
	changedUrl = 'http://localhost:' + port + '/changed';

function startServer() {
	tinylr().listen(port);
}

// TODO: make live reload optional
startServer();

module.exports = {
	changed: function(url) {
		request.post(changedUrl)
		.send({ files: [ url ? url : 'index.html'] })
		.end(function(error, res) {
			if (error) {
				console.log(error);
				startServer();
			}
		});
	},
	changedFile: function(uri) {
		this.changed(path.relative(woods.site.directory, uri));
	}
};