var async = require('async');

var listBucket = function(knoxClient, marker, callback) {
	if ('function' == typeof marker) {
		callback = marker;
		marker = null;
	}
	var options,
		fullResults = [],
		hasMore = true;
	if (marker)
		options = { marker: marker };

	var addResults = function(results, done) {
		if (!results.Contents) {
			hasMore = false;
			return done();
		}

		fullResults.push.apply(fullResults, results.Contents);
		// If there are more results to be had, set the marker to
		// the key of the last result. The next listing will start
		// from there:
		hasMore = !!results.IsTruncated && results.Contents &&
				results.Contents.length == 1000;
		if (hasMore) {
			options = {
				marker: results.Contents[results.Contents.length - 1].Key
			};
		}
		done();
	};

	var hasMoreResults = function() {
		return hasMore;
	};

	var getList = function (done) {
		knoxClient.list(options, function(err, data) {
			if (data && data.Code)
				err = Error(data.Code);
			if (err)
				return done(err);
			return addResults(data, done);
		});
	};

	var gotList = function(err) {
		callback(err, fullResults);
	};

	async.whilst(hasMoreResults, getList, gotList);
};

module.exports = listBucket;