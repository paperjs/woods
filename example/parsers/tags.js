module.exports = {
	tags: function(string, page) {
		// Split on commas surrounded by 0 or more spaces:
		var names = string.split(/\s*,\s*/g);
		if (!names.length)
			return;
		var site = page.site,
			siteTags = site.tags,
			pageTags = page.tags;
		if (!siteTags) siteTags = site.tags = [];
		if (!pageTags) pageTags = page.tags = [];
		names.forEach(function(name) {
			// Note: site.tags is being treated
			// as an object literal and array:
			var tag = siteTags[name];
			if (!tag) {
				tag = siteTags[name] = [];
				siteTags.push(tag);
			}
			tag.push(page);
			pageTags.push(tag);
		});
	}
};