var woods = require('./woods'),
		changed = changedFile = new Function();

// Only start the LR server if Node is running
// in dev mode.
if (woods.express.get('env') == 'development' && !woods.export) {
	var tinylr = require('tiny-lr'),
		request = require('superagent'),
		path = require('path');

	// standard LiveReload port
	var port = 35729, changedUrl = 'http://localhost:' + port + '/changed';

	var startServer = function() {
			tinylr().listen(port);
	};

	startServer();

	changed = function(url) {
		request.post(changedUrl)
		.send({ files: [ url ? url : 'index.html'] })
		.end(function(error, res) {
			if (error) {
				console.log(error);
				startServer();
			}
		});
	};
	changedFile = function(uri) {
		this.changed(path.relative(woods.site.directory, uri));
	};
}

// Set exports. When LR is disabled it's just empty functions.
module.exports = {
	changed: changed,
	changedFile: changedFile
};
