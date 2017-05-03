var utils = require('./utils');
var utilsStr = require('./utils-string');

var HTMLLayer = require('./html-layer');
var EventLayer = require('./event-layer');
var SearchLayer = require('./search-layer');

function Dropdown(selectNode, options) {
   this._state = {};
   this._initState(selectNode, options);
   this._timer = false;
   this._htmlLayer = new HTMLLayer(this._state);
   this._eventLayer = new EventLayer(this);

   this._searchLayer = new SearchLayer(this._state.items, options.ajaxSearchURL);
   if (options.combobox)
      this._searchLayer.scheduleIndexBuild();

   this._wrapper = this._htmlLayer.initLayout(selectNode);
   this.render();

   this._eventLayer.bindEventListeners();
};

Dropdown.prototype.getValue = function() {
   return this._state.value || [];
};

Dropdown.prototype.setValue = function(v) {
   this._state.value = v;
};

Dropdown.prototype.val = function(v) {
   return v ? this.setValue(v) : this.getValue();
};

Dropdown.prototype.open = function() {
   if (this._state.isOpen) return true;

   this._state.isOpen = true;
   this._state.isFocused = true;
   this._wrapper.focus();
   this.render();
   return true;
};

Dropdown.prototype.close = function() {
   if (!this._state.isOpen) return true;

   this._state.isOpen = false;
   this._state.isFocused = false;
   this._state.searchQuery = '';
   this._state.visibleItems = this._initVisibleItems();

   this._wrapper.blur();
   this.render();
   return true;
};

Dropdown.prototype.render = function() {
   this._htmlLayer.render(this.getValue());
   var i = this._wrapper.querySelector('.dd-input');
   if (i) i.addEventListener('blur',
      this._eventLayer.handleInputBlur.bind(this._eventLayer));
};

// Initialization methods
Dropdown.prototype._initState = function(node, options) {
   this._state.options = options;
   this._state.items = utils.parseOptionNodes(node.options);
   this._state.visibleItems = this._state.items;
   this._state.searchQuery = '';

   this._state.isOpen = false;
   this._state.isFocused = false;
   this._state.isRubbery = options.multiselect;

   this._state.value = false;
   this._state.placeholder = 'Выберите что-нибудь';
};

// Small wrapper methods for searchLayer
Dropdown.prototype._initVisibleItems = function() {
   if (!this._state.options.combobox && !this._state.options.multiselect) {
      return this._state.items.slice(0);
   }

   return this._searchLayer.initVisibleItems(this.getValue());
};

Dropdown.prototype._updateVisibleItems = function(callback) {
   // console.time('updateVisible');
   var query = this._state.searchQuery;
   var currentValue = this.getValue();
   callback = callback || function() {};

   if (!query) {
      this._state.visibleItems = this._initVisibleItems();
      callback(this._state.visibleItems);
      return true;
   }

   return this._searchLayer.getVisibleItems(query, currentValue, callback);
};

module.exports = Dropdown;
