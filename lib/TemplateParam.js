var marked = require('marked');

function TemplateParam(page, param) {
	param.page = page;
	this.page = page;
	this.site = page.site;
	this.root = page.site.root;
	this.param = param;

	/*
	*	Jade calls the prototype functions (eg. isActive, inPath etc.)
	*	without their context since version 0.31.0 (this == the global object).
	*	In order to preserve the context, walk through all properties that are
	*	functions and rebind them.
	*/
	var that = this;

	for (var prop in this) {
		if (this[prop] instanceof Function) {
			this[prop] = this[prop].bind(that);
		}
	}
}

TemplateParam.prototype = {
	isActive: function(page) {
		return page == this.param._activePage;
	},

	isDescendantOfActive: function(page) {
			var queriedPage = this.param._activePage;
			while (queriedPage = queriedPage.parent) {
				if (page == queriedPage)
					return true;
			}
			return false;
	},

	inPath: function(page) {
		return this.isActive(page) || page.isAncestor(this.param._activePage);
	},

	markdown: function(string) {
		return string ? marked(string) : '';
	},

	template: function(name, page, param) {
		return (page || this.page).template(name, param || this.param);
	},

	paginate: function(collection, perPage) {
		return collection.paginate(this.param.number, perPage);
	}
};

module.exports = TemplateParam;
