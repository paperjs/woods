var tinylr = require('tiny-lr'),
	request = require('superagent');

// standard LiveReload port
var port = 35729,
	changedUrl = 'http://localhost:' + port + '/changed';

function startServer() {
	tinylr().listen(port);
}

// TODO: make live reload optional
startServer();

module.exports = {
	changed: function() {
		request.post(changedUrl)
		.send({ files: [ 'index.html'] })
		.end(function(error, res) {
			if (error) {
				console.log(error);
				startServer();
			}
		});
	}
};