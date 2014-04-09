var woods = require('./woods');
// Only start the LR server if Node is running
// in dev mode.
woods.express.configure('development', function(){
	var tinylr = require('tiny-lr'),
		request = require('superagent'),
		path = require('path');

	// standard LiveReload port
	var port = 35729,
		changedUrl = 'http://localhost:' + port + '/changed';

	function startServer() {
		tinylr().listen(port);
	}

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
});

// Provide an empty wrapper in production
woods.express.configure('production', function(){
	module.exports = {
		changed: function () {
		},
		changedFile: function () {
		}
	};
});
