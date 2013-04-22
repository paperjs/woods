var Pagination = function(collection, perPage, current) {
	this.collection = collection;
	this.total = this.collection.length;
	this.perPage = perPage || 10;
	this.pageCount = Math.ceil(collection.length / this.perPage);
	this.current = Math.min(Math.max(current || 1, 1), this.pageCount);
};

Pagination.prototype = {
	hasNext: function() {
		return this.current < this.pageCount;
	},

	next: function() {
		if (this.hasNext())
			return this.current + 1;
	},

	hasPrevious: function() {
		return this.current > 1;
	},

	previous: function() {
		if (this.hasPrevious())
			return this.current - 1;
	},

	atFirstPage: function() {
		return this.current == 1;
	},

	atLastPage: function() {
		return this.current == this.pageCount;
	},

	firstIndex: function() {
		return Math.max(0, this.perPage * (this.current - 1));
	},

	lastIndex: function() {
		return Math.min(
			Math.max(0, this.perPage * this.current),
			Math.max(this.total, 0)
		);
	}
};

module.exports = Pagination;
