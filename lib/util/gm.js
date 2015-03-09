var gm;
var exec = require('child_process').exec;

exec('gm', function (error, stdout, stderr) {
	if (!stderr.length) {
		gm = require('gm');
	} else {
		console.error('You should install Graphics Magick for thumbnail support: http://www.graphicsmagick.org/');
	}
});

module.exports = function() {
	return gm.apply(null, arguments);
};
