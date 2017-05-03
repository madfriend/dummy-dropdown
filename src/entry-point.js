var utils = require('./utils');
var Dropdown = require('./dropdown');

require('./dummy-dropdown.css');


if (typeof console === "undefined" ||
    typeof window._DROPDOWN_DEBUG === "undefined" ||
    !window._DROPDOWN_DEBUG) {
  var console = {log: function() {}, time: function() {}, timeEnd: function() {}};
}


function DropdownCollection(selector, options) {
   if (typeof options != 'object') options = {};
   var defaults = {
      multiselect: false,
      combobox: false,
      withImages: false,
      withDesc: false,
      ajaxSearchURL: false
   };

   var _options = utils.extendObject(defaults, options);
   this._options = _options;

   var results = [];
   try {
      results = document.querySelectorAll(selector);
   } catch (e) {
      console.log('Check your selector. ' + e);
   }

   var _nodes = utils.filterNodesByTag(results, 'select');
   this.dropdowns = [];
   for (var i = 0; i < _nodes.length; i++) {
      this.dropdowns.push(new Dropdown(_nodes[i], _options));
   };
}

DropdownCollection.prototype.get = function(i) {
   return this.dropdowns[i || 0];
};

module.exports = DropdownCollection;
