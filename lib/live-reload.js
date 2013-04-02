var tinylr = require('tiny-lr'),
	request = require('superagent');

// standard LiveReload port
var port = 35729,
	changedUrl = 'http://localhost:' + port + '/changed';

tinylr().listen(port, function(err) {
	if (err)
		console.log(err);
	console.log('LiveReload server is active.');
});

module.exports = {
	changed: function() {
		request.post(changedUrl)
		.send({ files: [ 'index.html'] })
		.end(function(error, res) {
			if (error)
				console.log(error);
		});
	}
};