module.exports = {
	related: function(urls, page) {
		urls = urls.split(/,\s*/g);
		page.related = [];
		urls.forEach(function(url) {
			var relatedPage = page.get(url);
			if (relatedPage)
				page.related.push(relatedPage);
		});
	}
};