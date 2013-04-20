module.exports = watchDirectory;

function watchDirectory(site) {
	var options = { recursive: true, followSymLinks: true },
		changes = [],
		timeoutId;
	var changed = function(uri) {
		// ignore hidden files
		if ((/^\./).test(path.basename(uri)))
			return;

		if ((/\/(thumbnails)\//).test(uri))
			thumbnails.checkCache(uri);

		if ((/\/(assets)\//).test(uri))
			return liveReload.changed(path.relative(woods.directory, uri));

		if (timeoutId)
			clearTimeout(timeoutId);

		changes.push(uri);

		// Make the timeout longer by the amount of filesystem changes:
		var timeoutTime = 10 * changes.length + 30;

		timeoutId = setTimeout(function() {
			var then = new Date();
			// TODO: go through changes array instead and apply individual changes
			// instead of rebuilding the whole site?
			build(site, function() {
				console.log('Rebuilt', site.pageCount, 'pages in', new Date() - then);
				liveReload.changed();
			});
			changes.length = 0;
		}, timeoutTime);
	};
	watch(site.getUri(), options, changed);
}