var gm;
var exec = require('child_process').exec;

exec('gm', function (error, stdout, stderr) {
	if (!stderr.length) {
		gm = require('gm');
	} else {
		console.error('Please install Graphics Magick: http://www.graphicsmagick.org/')
		throw error;
	}
});

module.exports = function() {
	return gm.apply(null, arguments);
};