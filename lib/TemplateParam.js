var marked = require('marked');

function TemplateParam(page, param) {
	this.page = page;
	this.site = page.site;
	this.root = page.site.root;
	for (var key in param) {
		if (key != 'page' && !this[key] && param.hasOwnProperty(key)) {
			this[key] = param[key];
		}
	}
}

TemplateParam.prototype = {
	isActive: function(page) {
		return page == this._activePage;
	},

	markdown: function(string) {
		return string ? marked(string) : '';
	},

	render: function(template, page, param) {
		for (var key in param)
			this[key] = param[key];
		return (page || this.page)._renderTemplate(template, this);
	},

	paginate: function(collection, perPage) {
		return collection.paginate(this.number, perPage);
	}
};

module.exports = TemplateParam;