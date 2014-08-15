var mkdirp = require('mkdirp'),
	fs = require('fs'),
	path = require('path'),
	async = require('async'),
	knox = require('knox'),
	crypto = require('crypto');

var Page = require('./Page'),
	Site = require('./Site'),
	File = require('./File'),
	fsUtil = require('./util/fs.js'),
	listBucket = require('./listBucket');

var hash = function(object, callback) {
	if (object.file)
		return hashFile(object.file, callback);
	callback(null, hashString(object.string));
};

var hashFile = function (file, callback) {
	var hash = crypto.createHash('md5');
	hash.setEncoding('hex');
	var readStream = fs.createReadStream(file);
	readStream.on('end', function() {
		hash.end();
		callback(null, hash.read());
	});
	readStream.pipe(hash);
};

var hashString = function(string) {
	return crypto.createHash('md5').update(string).digest('hex');
};

var exportSite = function(site, save, done) {
	var pageQueue = async.queue(function(page, done) {
		page.files.forEach(addToQueue);
		save(page, path.join(page.url, 'index.html'), done);
	}, 10);

	var queuePages = function(page) {
		// Filter out pages whose names consist only of dashes (e.g. used for
		// navigation spacers), since their URL parts would collapse and over-
		// ride parent pages.
		// TODO: Find a better fix.
		if (!/^-*$/.test(page.name)) {
			addToQueue(page);
		}
		for (var i = 0; i < page.children.length; i++)
			queuePages(page.children[i]);
		if (page.translatedCopies) {
			for (var lang in page.translatedCopies) {
				queuePages(page.translatedCopies[lang]);
			}
		}
	}

	var addToQueue = function(task) {
		if (task instanceof Page)
			return pageQueue.push(task);
		queue.push(task);
	}

	var queue = async.queue(function(task, done) {
		if (task instanceof File)
			return save({ file: task.uri }, path.relative(site.root.url, task.url), done);

		if (task.file)
			return save(task, path.relative(site.getUri(), task.file), done);

		fsUtil.recursiveDirectoryList(task.directory, function(err, found) {
			if (err) return done(err);
			found.files.forEach(function(file) {
				addToQueue({file: file});
			});
			done();
		});
	}, 10);

	var uploadAssets = function() {
		addToQueue({directory: site.getUri('assets')});
		queue.drain = done;
	}

	// When the page queue has drained, check if there are any thumbnails left
	// to be rendered:
	pageQueue.drain = function(err) {
		if (err) return callback(err);
		if (site.thumbnails.queueLength > 0) {
			console.log('Waiting for thumbnails to finish exporting...');
			return site.thumbnails.on('done', uploadAssets);
		}
		uploadAssets();
	};

	queuePages(site.root);
};

Site.prototype.publish = function(directory, callback) {
	var site = this;
	directory = directory ? directory : path.join(site.directory, 'out');
	var save = function(object, uri, callback) {
		var file = path.join(directory, uri),
			dir = path.dirname(file);

		mkdirp(dir, function() {
			if (object instanceof Page) {
				var html = object.getHtml();
				return fs.writeFile(file, html, callback);
			}
			fs.createReadStream(object.file).pipe(fs.createWriteStream(file)).on('close', callback);
		});
	};
	mkdirp(directory, function() {
		exportSite(site, save, callback);
	});
};

Site.prototype.syncS3 = function(callback) {
	if (!this.settings.s3key || !this.settings.s3secret || !this.settings.s3bucket)
		return callback(Error('S3 configuration not found. Missing one or more of s3key, s3secret and s3bucket settings in site-directory/settings.md'));
	var rootUrl = this.root.url,
		s3List = {};

	var client = knox.createClient({
		key: this.settings.s3key,
		secret: this.settings.s3secret,
		bucket: this.settings.s3bucket,
		region: this.settings.s3region || 'us-standard',
		secure: true
	});

	var listFiles = function(callback) {
		console.log('Getting S3 bucket list');
		listBucket(client, function(err, results) {
			if (err) return callback(err);
			results.forEach(function(result) {
				s3List[result.Key] = result.ETag;
			});
			callback();
		});
	};

	var put = function(object, uri, callback) {
		if (object instanceof Page)
			return putHtml(object, callback);
		var done = function() {
			delete s3List[uri];
			process.nextTick(callback);
		};
		hash(object, function(err, hash) {
			if (err) return callback(err);
			// Skip the file if the hashes match (note that Amazon
			// puts quotes around their ETags, so we have to do the same)
			if (s3List[uri] && s3List[uri] == '"' + hash + '"')
				return done();
			client.putFile(object.file, uri, { 'x-amz-acl': 'public-read' }, done);
		});
	};

	var putHtml = function(page, callback) {
		var uri = path.join(path.relative(rootUrl, page.url), 'index.html');
		var html = page.getHtml();

		var s3Options = {
			'x-amz-acl': 'public-read',
			'Content-Type': 'text/html'
		};
		if (s3List[uri] && s3List[uri] == '"' + hashString(html) + '"') {
			delete s3List[uri];
			return callback();
		}
		client.putBuffer(html, uri, s3Options, callback);
	};

	var site = this;
	listFiles(function(err) {
		if (err) return callback(err);
		exportSite(site, put, function(err) {
			if (err) return callback(err);
			var toDelete = [];
			for (var uri in s3List)
				toDelete.push(uri);
			async.eachLimit(toDelete, 10, function(file, done) {
				client.deleteFile(file, done);
			}, callback);
		});
	});
};
