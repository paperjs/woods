var marked = require('marked');

function TemplateParam(page, param) {
	var savedScope;
	/*
	*	Jade calls the prototype functions (eg. isActive, inPath etc.)
	*	without their context since version 0.31.0 (this == the global object).
	*	In order to preserve the context, we create a reference to "this"
	*	called savedScope and wrap the whole TemplateParam function in a closure,
	*	so that this var is always accessible.
	*/
	function Closure() {
		param.page = page;
		this.page = page;
		this.site = page.site;
		this.root = page.site.root;
		this.param = param;
		savedScope = this;
	}
	Closure.prototype = {
		isActive: function(page) {
			return page == savedScope.param._activePage;
		},

		inPath: function(page) {
			return savedScope.isActive(page) || page.isAncestor(savedScope.param._activePage);
		},

		markdown: function(string) {
			return string ? marked(string) : '';
		},

		template: function(name, page, param) {
			return (page || savedScope.page).template(name, param || savedScope.param);
		},

		paginate: function(collection, perPage) {
			return collection.paginate(savedScope.param.number, perPage);
		}
	};
	return new Closure();
}

module.exports = TemplateParam;
