var request = require('superagent'),
	mkdirp = require('mkdirp'),
	fs = require('fs'),
	path = require('path'),
	async = require('async'),
	knox = require('knox'),
	hashFile = require('hash_file'),
	crypto = require('crypto');

var Page = require('./Page'),
	Site = require('./Site'),
	File = require('./File'),
	fsUtil = require('./fs-util'),
	listBucket = require('./listBucket');

Site.prototype.syncS3 = function(callback) {
	if (!this.settings.s3key || !this.settings.s3secret || !this.settings.s3bucket)
		return callback(Error('S3 configuration not found. Missing one or more of s3key, s3secret and s3bucket settings in site-directory/settings.md'));
	var site = this,
		rootUrl = this.root.url,
		s3List = {};

	var client = knox.createClient({
		key: this.settings.s3key,
		secret: this.settings.s3secret,
		bucket: this.settings.s3bucket,
		region: this.settings.s3region || 'us-standard',
		// We have to set secure to false, when the bucket name has .'s in it
		// because Amazon doesn't like it
		secure: this.settings.s3bucket.indexOf('.') == -1
	});

	var util = {
		escapeRegex: function(str) {
			return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		},

		getPageHtml: function(page, callback) {
			request
				.get(page.href())
				.buffer()
				.end(function(err, res) {
					if (err) return callback(err);
					return callback(null, res.text);
				});
		},

		listFiles: function(callback) {
			console.log('Getting S3 bucket list');
			listBucket(client, function(err, results) {
				if (err) return callback(err);
				results.forEach(function(result) {
					s3List[result.Key] = result.ETag;
				});
				callback();
			});
		},

		hash: function(object, callback) {
			if (object.file)
				return hashFile(object.file, callback);
			callback(null, crypto.createHash('md5').update(object.string).digest('hex'));
		},

		deleteS3: function(uri, callback) {
			client.deleteFile(uri, function(err, res) {
				if (err) return callback(err);
				console.log('Deleted', uri);
				return callback();
			});
		},

		put: function(object, remoteUri, callback) {
			var done = function() {
				delete s3List[remoteUri];
				process.nextTick(callback);
			};
			var s3Options = { 'x-amz-acl': 'public-read' };
			util.hash(object, function(err, hash) {
				if (err) return callback(err);
				// Skip the file if the hashes match (note that Amazon
				// puts quotes around their ETags, so we have to do the same)
				if (s3List[remoteUri] && s3List[remoteUri] == '"' + hash + '"')
					return done();
				console.log('Uploading', remoteUri);
				if (object.file)
					return client.putFile(object.file, remoteUri, s3Options, done);

				s3Options['Content-Type'] = 'text/html';
				client.putBuffer(object.string, remoteUri, s3Options, done);
			});
		},

		putHtml: function(page, callback) {
			var remoteUri = path.join(path.relative(rootUrl, page.url), 'index.html');
			util.getPageHtml(page, function(err, html) {
				if (err) return callback(err);
				util.put({ string: html }, remoteUri, callback);
			});
		},

		addToQueue: function(task) {
			if (task instanceof Page)
				return pageQueue.push(task);
			queue.push(task);
		},

		uploadAssets: function() {
			util.addToQueue({directory: site.getUri('assets')});
			queue.drain = function(err) {
				if (err) return callback(err);
				var toDelete = [];
				for (var uri in s3List)
					toDelete.push(uri);
				async.eachLimit(toDelete, 10, util.deleteS3, callback);
			};
		},

		queuePages: function(page) {
			if (!page)
				page = site.root;
			util.addToQueue(page);
			for (var i = 0; i < page.children.length; i++)
				util.queuePages(page.children[i]);
		}
	};

	var pageQueue = async.queue(function(page, done) {
		page.files.forEach(util.addToQueue);
		util.putHtml(page, done);
	}, 10);

	var queue = async.queue(function(task, done) {
		if (task instanceof File)
			return util.put({ file: task.uri }, path.relative(rootUrl, task.url), done);

		if (task.file)
			return util.put(task, path.relative(site.getUri(), task.file), done);

		fsUtil.recursiveDirectoryList(task.directory, function(err, found) {
			if (err) return done(err);
			found.files.forEach(function(file) {
				util.addToQueue({file: file});
			});
			done();
		});
	}, 10);

	// When the page queue has drained, check if there are any thumbnails left
	// to be rendered:
	pageQueue.drain = function(err) {
		if (err) return callback(err);
		// TODO: make thumbnails queue site specific
		if(site.thumbnails.queueLength > 0) {
			console.log('Waiting for thumbnails to finish exporting...');
			site.thumbnails.on('done', util.uploadAssets);
		} else {
			util.uploadAssets();
		}
	};

	util.listFiles(function(err) {
		if (err) return callback(err);
		util.queuePages();
	});
};