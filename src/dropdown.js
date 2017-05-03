var utils = require('./utils');
var utilsStr = require('./utils-string');
var HTMLLayer = require('./html-layer');


function Dropdown(selectNode, options) {
   this._state = {};
   this._initState(selectNode, options);
   this._timer = false;
   this._html = new HTMLLayer(this._state);
   this._wrapper = this._html.initLayout(selectNode);

   this.render();
   this._bindEventListeners();
};

var kbdDebounceTimeout = 100;
var maxResultsLen = 30;

// Public API //////////////////////////////////////////////////////////////
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
   this._html.render(this.getValue());
   var i = this._wrapper.querySelector('.dd-input');
   if (i) i.addEventListener('blur', this._handleInputBlur.bind(this));
};

// "Private" API ///////////////////////////////////////////////////////////
// Initialization methods
Dropdown.prototype._initState = function(node, options) {
   this._state.options = options;
   this._state.items = utils.parseOptionNodes(node.options);
   this._state.visibleItems = this._initVisibleItems();
   this._state.searchQuery = '';

   this._state.isOpen = false;
   this._state.isFocused = false;
   this._state.isAddingFocusOnInput = false;
   this._state.isRubbery = options.multiselect;

   this._state.value = false;
   this._state.placeholder = 'Выберите что-нибудь';

   this._searchIndex = {};
   if (options.combobox) {
      window.setTimeout(this._initSearchIndex.bind(this), 0);
   }
};

Dropdown.prototype._initVisibleItems = function() {
   if (!this._state.options.combobox && !this._state.options.multiselect) {
      return this._state.items.slice(0);
   }

   var out = [];
   var value = this.getValue();
   var found = 0;

   for (var i = 0; i < this._state.items.length; i++) {
      var item = this._state.items[i];
      if (value.indexOf(item.value) >= 0) continue;
      out.push(item);
      found++;
      if (found >= maxResultsLen) break;
   }

   return out;
};

Dropdown.prototype._initSearchIndex = function() {
   // console.time('makeSearchIndex');

   // Currently this is a very blunt structure.
   // If performance of this piece of code would be disappointing,
   // one might try to rewrite this structure (and whole search) to be
   // more efficient.
   //
   // For example, we can make [token -> (value_id, span)] map where
   // keys are all possible tokens in all possible layouts and
   // value_id is the sentence which provided the token.
   //
   // Then we can be build a prefix tree for all tokens
   // where each level of tree has special <END> key
   // containing a list references of (value_id, span).

   var items = this._state.items;
   var index = this._searchIndex;

   for (var i = 0; i < items.length; i++) {
      index[items[i].value] = [];
      var all_ngrams = utilsStr.allPossibleTokens(items[i].value);
      for (var j = 0; j < all_ngrams.length; j++) {
         index[items[i].value] = index[items[i].value].concat(
            utilsStr.allKeyboardLayoutInvariants(all_ngrams[j].toLowerCase()));
      }
   };
   // console.timeEnd('makeSearchIndex');
};

// Event API: bind + all event handlers.
Dropdown.prototype._bindEventListeners = function() {
   this._wrapper.addEventListener('mousedown', this._handleClick.bind(this));
   this._wrapper.addEventListener('keydown', this._handleSpecialKeys.bind(this));
   this._wrapper.addEventListener('keyup', utils.debounce(
      this._handleTextInput.bind(this), kbdDebounceTimeout));

   this._wrapper.addEventListener('focus', this._handleFocus.bind(this));
   this._wrapper.addEventListener('blur', this._handleFocusout.bind(this));

   this._wrapper.addEventListener('mouseover', this._handleMouseover.bind(this));
};

Dropdown.prototype._handleFocus = function(event) {
   // console.log('focus', event);
   if (this._state.isFocused) {
      return false;
   }

   this._state.isFocused = true;
   this._state.isOpen = true;
   this.render();

   if (this._state.options.combobox) this._focusOnInput();

   return false;
};

Dropdown.prototype._handleMouseover = function(event) {
   var tgt = event.target;
   if (utils.anyParentHasClass(tgt, 'dd-item')) {
      tgt = utils.findParentOrSelfWithClass(tgt, 'dd-item');
      event.stopPropagation();
      if (utils.hasClass(tgt, 'dd-hover')) return false;
      var other = this._wrapper.querySelectorAll('.dd-hover');

      for (var i = 0; i < other.length; i++) {
         utils.removeClass(other[i], 'dd-hover');
      }

      tgt.className += ' dd-hover';
   }
};

Dropdown.prototype._handleFocusout = function(event) {
   // console.log('blur - parent', this._state.isAddingFocusOnInput);
   if (this._state.isAddingFocusOnInput) return false;

   event.stopPropagation();
   this._state.isFocused = false;
   this.close();
   return false;
};

Dropdown.prototype._handleDelete = function(event) {
   console.log('handleDelete', event.target, event.target.getAttribute('data-value'));
   var del = event.target.getAttribute('data-value');
   var values = this.getValue();
   var index = values.indexOf(del);
   if (index < 0) return false;

   values.splice(index, 1);
   this.setValue(values);

   if (this._state.isOpen) {
      this.close();
   }
   else {
      this._state.visibleItems = this._initVisibleItems();
      this.render();
   }

   return false;
};

Dropdown.prototype._handleClick = function(event) {
   // console.log('click', event);
   event.stopPropagation();
   var tgt = event.target;

   if (utils.anyParentHasClass(tgt, 'dd-item')) {
      tgt = utils.findParentOrSelfWithClass(tgt, 'dd-item');
      if (utils.hasClass(tgt, 'dd-selected')) return false;

      if (!this._state.options.multiselect) {
         this.setValue([tgt.getAttribute('data-value')]);
      } else {
         var v = this.getValue();
         this.setValue(v.concat([tgt.getAttribute('data-value')]));
      }
      this.close();
      return false;
   }

   if (utils.hasClass(tgt, 'dd-delete')) {
      event.preventDefault();
      this._handleDelete(event);
      return false;
   }

   if (utils.hasClass(tgt, 'dd-input')) {
      return false;
      // this._focusOnInput();
   }

   if (utils.hasClass(tgt, 'dd-arrow')) {
      if (this._state.isOpen) return this.close();
   }

   return setTimeout(function() {
      // console.log('setting focus to parent');
      if (!this._state.isFocused) this._wrapper.focus();
   }.bind(this), 10);
};

Dropdown.prototype._handleInputBlur = function(event) {
   // console.log('blur - input');
   this._state.isFocused = false;
   this.close();
   return false;
};

Dropdown.prototype._handleSpecialKeys = function(event) {
   var specialCodes = [38, 40, 13, 27]; // up, down, enter, esc

   if (specialCodes.indexOf(event.keyCode) >= 0) {
      event.stopImmediatePropagation();
      event.preventDefault();
   } else {
      return false;
   }

   var current = this._wrapper.querySelector('.dd-hover');
   var prev = false;
   var next = false;

   if (current) {
      prev = current.previousElementSibling;
      next = current.nextElementSibling;
   }
   else {
      next = this._wrapper.querySelector('.dd-item');
   }

   switch (event.keyCode) {
      case 38: // up
         if (!prev) return false;
         prev.className += ' dd-hover';
         if (!utils.checkInView(prev.parentNode, prev))
            prev.parentNode.scrollTop = prev.offsetTop;

         if (current) utils.removeClass(current, 'dd-hover');
         return false;
         break;

      case 40: // down
         if (!next) return false;
         next.className += ' dd-hover';

         if (!utils.checkInView(next.parentNode, next)) {
            next.parentNode.scrollTop =
               (next.offsetTop - next.parentNode.clientHeight + next.clientHeight);
         }

         if (current) utils.removeClass(current, 'dd-hover');
         return false;
         break;

      case 13: // enter
         var active = this._wrapper.querySelector('.dd-hover');
         if (!active) return false;
         if (utils.hasClass(active, 'dd-selected')) return false;

         if (!this._state.options.multiselect) {
            this.setValue([active.getAttribute('data-value')]);
         } else {
            var v = this.getValue();
            this.setValue(v.concat([active.getAttribute('data-value')]));
         }

         this.close();
         return false;
         break;

      case 27: // esc
         this.close();
         break;

      default:
         break;
   }
};

Dropdown.prototype._handleTextInput = function(event) {
   if (!this._state.isOpen || !this._state.options.combobox) return false;
   var specialCodes = [38, 40, 13, 27]; // up, down, enter, esc
   if (specialCodes.indexOf(event.keyCode) >= 0) return false;

   var input = this._wrapper.querySelector('.dd-input');
   var val = input.value;
   if (val === this._state.searchQuery) return false;

   window.clearTimeout(this._timer);

   this._timer = window.setTimeout(function() {
         this._state.searchQuery = val;
         this._updateVisibleItems(this._html.renderTail.bind(this._html));
      }.bind(this), 0);

   return false;
};

// Various pieces of search API
Dropdown.prototype._updateVisibleItems = function(callback) {
   // console.time('updateVisible');
   var query = this._state.searchQuery;
   var currentValue = this.getValue();

   callback = callback || function() {};

   function filterItems(whitelist) {
      var l = 0;
      var filtered = [];

      for (var i = 0; i < this._state.items.length; i++) {
         var item = this._state.items[i];
         if (currentValue.indexOf(item.value) >= 0) continue;
         if (whitelist.indexOf(item.value) >= 0 || this._matchesQuery(item)) {
            l++;
            filtered.push(item);
         }
         if (l >= maxResultsLen) break;
      };
      this._state.visibleItems = filtered;
   };

   filterItems = filterItems.bind(this);

   if (!query) {
      this._state.visibleItems = this._initVisibleItems();
      callback();
      return true;
   }

   if (this._state.options.combobox &&
       this._state.options.ajaxSearchURL) {

      this._searchItemsOnServer(function(results) {
         filterItems(results);
         callback();
      });

   }
   else {
      filterItems([]);
      callback();
   }

   // console.timeEnd('updateVisible');
   return true;
};

Dropdown.prototype._searchItemsOnServer = function(callback) {
   var queries = utilsStr.allKeyboardLayoutInvariants(this._state.searchQuery);
   var qs = [];
   for (var i = 0; i < queries.length; i++) {
      qs.push('query=' + encodeURIComponent(queries[i]));
   }

   utils.ajaxGetJSON(this._state.options.ajaxSearchURL + '?' + qs.join('&'),
      callback);
};

Dropdown.prototype._matchesQuery = function(item) {
   var q = this._state.searchQuery;
   var tests = this._searchIndex[item.value] || item.value.split(/\s+/);
   for (var i = 0; i < tests.length; i++) {
      if (utilsStr.startsWith(tests[i], q.toLowerCase())) return true;
   };
   return false;
};

Dropdown.prototype._focusOnInput = function() {
   var i = this._wrapper.querySelector('.dd-input');
   this._state.isAddingFocusOnInput = true;
   setTimeout(function() {
      // console.log('setting focus on input');
      i.focus();
      setTimeout(function() { // IE9..
         this._state.isAddingFocusOnInput = false;
      }.bind(this), 10);

      var v = i.value;
      i.value = '';
      i.value = v;

   }.bind(this), 10);

   return true;
};

module.exports = Dropdown;
