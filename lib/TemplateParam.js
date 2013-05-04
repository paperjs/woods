var marked = require('marked');

function TemplateParam(page, param) {
	param.page = page;
	this.page = page;
	this.site = page.site;
	this.root = page.site.root;
	this.param = param;
}

TemplateParam.prototype = {
	isActive: function(page) {
		return page == this.param._activePage;
	},

	inPath: function(page) {
		return this.isActive(page) || page.isAncestor(this.param._activePage);
	},

	markdown: function(string) {
		return string ? marked(string) : '';
	},

	render: function(template, page, param) {
		return (page || this.page).template(template, param || this.param);
	},

	paginate: function(collection, perPage) {
		return collection.paginate(this.param.number, perPage);
	}
};

module.exports = TemplateParam;