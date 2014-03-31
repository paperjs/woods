/**
 * @name Collection
 *
 * @class The Collection type is used for Page#children / Page#files etc, 
 */

var array = require('array'),
	util = require('util');

var Pagination = require('./Pagination');

/**
 * Returns the visible items contained within the collection
 * as a new Collection.
 * 
 * @return {Collection}
 */
array.prototype.visible = function() {
	return this.filter(function(page) {
		return !!page.visible;
	});
};

/**
 * Returns the invisible items contained within the collection
 * as a new Collection.
 * 
 * @return {Collection}
 */
array.prototype.invisible = function() {
	return this.filter(function(page) {
		return !page.visible;
	});
};

/**
 * Returns a new collection containing the items of this collection
 * flipped in order.
 * 
 * @return {Collection}
 */
array.prototype.flip = function() {
	return this.slice(0).reverse();
};

/**
 * Returns a new collection containing the items of this collection
 * shuffled randomly in order.
 * 
 * @return {Collection}
 */
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

array.prototype.inGroupsOf = function(n){
  var arr = [];
  var group = [];

  for (var i = 0, len = this.length; i < len; ++i) {
    group.push(this[i]);
    if ((i + 1) % n === 0) {
      arr.push(group);
      group = [];
    }
  }

  if (group.length) arr.push(group);

  return new array(arr);
};

array.prototype.paginate = function(current, perPage) {
	var pagination = new Pagination(this, perPage, current),
		items = this.slice(pagination.firstIndex(), pagination.lastIndex());
	items.pagination = pagination;
	return items;
};

module.exports = array;
