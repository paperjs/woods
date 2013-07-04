function Pagination(collection, perPage, index) {
	this.collection = collection;
	this.perPage = perPage || 10;
	this._index = index;
}

Pagination.prototype = {
	getIndex: function() {
		return Math.min(Math.max(this._index, 1), this.pageCount());
	},

	pageCount: function() {
		return Math.ceil(this.collection.length / this.perPage);
	},

	hasNext: function() {
		return this.getIndex() < this.pageCount();
	},

	next: function() {
		if (this.hasNext())
			return this.getIndex() + 1;
	},

	hasPrevious: function() {
		return this.getIndex() > 1;
	},

	previous: function() {
		if (this.hasPrevious())
			return this.getIndex() - 1;
	},

	atFirstPage: function() {
		return this.getIndex() == 1;
	},

	atLastPage: function() {
		return this.getIndex() == this.pageCount();
	},

	firstIndex: function() {
		return Math.max(0, this.perPage * (this.getIndex() - 1));
	},

	lastIndex: function() {
		return Math.min(
			Math.max(0, this.perPage * this.getIndex()),
			Math.max(this.collection.length, 0)
		);
	}
};

module.exports = Pagination;
