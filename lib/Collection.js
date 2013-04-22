/**
 * @name Collection
 *
 * @class The Collection type is used for Page#children / Page#files etc, 
 */

var array = require('array.js'),
	util = require('util');

var Pagination = require('./Pagination');

array.prototype.visible = function() {
	return this.filter(function(page) {
		return !!page.visible;
	});
};

array.prototype.invisible = function() {
	return this.filter(function(page) {
		return !page.visible;
	});
};

array.prototype.flip = function() {
	return this.slice(0).reverse();
};

array.prototype.shuffle = function () {
	var arr = this.slice(0);
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
};

array.prototype.paginate = function(current, perPage) {
	var pagination = new Pagination(this, perPage, current),
		items = this.slice(pagination.firstIndex(), pagination.lastIndex());
	items.pagination = pagination;
	return items;
};

module.exports = array;