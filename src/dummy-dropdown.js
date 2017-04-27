if (typeof console === "undefined") {
  var console = {log: function() {}};
}

var DummyDropdown = (function() {
///////////////////////////////////////////////////////////////////////////////
// To make things easier, let's make two classes: an entry point for multiple
// dropdowns at once (DropdownCollection) and internal class for a single
// dropdown (Dropdown).
   function DropdownCollection(selector, options) {
      if (typeof options != 'object') options = {};
      var defaults = {
         multiselect: false,
         combobox: false,
         withImages: true,
         withDesc: true,
         ajaxMatchURL: false
      };

      var _options = _extendObject(defaults, options);
      this._options = _options;

      var results = [];
      try {
         results = document.querySelectorAll(selector);
      } catch (e) {
         console.log('Check your selector. ' + e);
      }

      var _nodes = filterNodesByTag(results, 'select');
      this.dropdowns = [];
      for (var i = 0; i < _nodes.length; i++) {
         this.dropdowns.push(new Dropdown(_nodes[i], _options));
      };
   }

   DropdownCollection.prototype.get = function(i) {
      return this.dropdowns[i || 0];
   };

///////////////////////////////////////////////////////////////////////////////
   function Dropdown(selectNode, options) {
      this._state = {};
      this._initState(selectNode, options);
      this._wrapper = this._prepareLayout(selectNode);
      this.render();
      this._bindEventListeners();
   };

   Dropdown.prototype._initState = function(node, options) {
      this._state.items = this._parseOptionNodes(node);
      this._state.isOpen = false;
      this._state.isFocused = false;

      this._state.value = false;
      this._state.options = options;
      this._state.placeholder = 'Выберите что-нибудь';
   };

   Dropdown.prototype._prepareLayout = function(node) {
      this._injectStyles();

      var wrapper = document.createElement('div');
      wrapper.setAttribute('tabindex', 0);

      wrapper.className = 'dd-n dd-wrapper dd-hidden';
      wrapper.style.width = node.offsetWidth + 'px';

      node.className += ' dd-hidden';
      node.parentNode.insertBefore(wrapper, node);
      // 2. Save a reference to the new wrapper box.
      return wrapper;
   };

   Dropdown.prototype.render = function() {
      console.log('render', this._state);
      var wrapper = this._wrapper;
      var ww = wrapper.clientWidth - 25;

      var markup = '';
      markup += (this._state.options.combobox ?
         this._comboHeadHTML(ww) : this._plainHeadHTML(ww));

      markup += this._listContentsHTML();

      wrapper.innerHTML = markup;
      wrapper.className = 'dd-n dd-wrapper ' +
         (this._state.isFocused ? 'dd-focused' : '');
   };

   Dropdown.prototype._bindEventListeners = function() {
      this._wrapper.addEventListener('click', this._handleClick.bind(this));
      this._wrapper.addEventListener('keyup',
         debounce(this._handleKeyboard.bind(this), 50));

      this._wrapper.addEventListener('focus', this._handleFocus.bind(this));
      this._wrapper.addEventListener('blur', this._handleBlur.bind(this));

      this._wrapper.addEventListener('mouseover', this._handleMouseover.bind(this));
   };

   Dropdown.prototype._handleFocus = function(event) {
      event.stopPropagation();
      this._state.isFocused = true;
      this._state.isOpen = true;

      if (hasClass(event.target, 'dd-delete')) {
         this._handleDelete(event);
      }
      else {
        this.render();
      }

      return false;
   };

   Dropdown.prototype._handleMouseover = function(event) {
      if (hasClass(event.target, 'dd-item')) {
         event.stopPropagation();
         if (hasClass(event.target, 'dd-hover')) return false;
         var el = event.target;
         var other = this._wrapper.querySelectorAll('.dd-hover');

         for (var i = 0; i < other.length; i++) {
            removeClass(other[i], 'dd-hover');
         }

         el.className += ' dd-hover';
      }
   };

   Dropdown.prototype._handleBlur = function(event) {
      event.stopPropagation();
      this._state.isFocused = false;
      this.close();
      return false;
   };

   Dropdown.prototype._handleDelete = function(event) {
      var del = event.target.getAttribute('data-value');
      var values = this.getValue();
      var index = values.indexOf(del);
      if (index < 0) return false;

      values.splice(index, 1);
      this.setValue(values);
      this.render();
      return false;
   };

   Dropdown.prototype._handleClick = function(event) {
      event.stopPropagation();

      if (hasClass(event.target, 'dd-item')) {
         if (!this._state.options.multiselect) {
            this.setValue([event.target.getAttribute('data-value')]);
         } else {
            var v = this.getValue();
            this.setValue(v.concat([event.target.getAttribute('data-value')]));
         }
         this.close();
         return false;
      }

      if (hasClass(event.target, 'dd-delete')) {
         this._handleDelete(event);
      }

      return false;
   };

   Dropdown.prototype.close = function() {
      if (!this._state.isOpen) return true;
      this._state.isOpen = false;
      this._state.isFocused = false;
      this._wrapper.blur();
      this.render();
      return true;
   }

   Dropdown.prototype._handleKeyboard = function(event) {
      // body...
   };

   Dropdown.prototype._listContentsHTML = function() {
      var contents = '';
      var item, markup;

      var value = this.getValue();

      for (var i = 0; i < this._state.items.length; i++) {
         item = this._state.items[i];
         var cls = '';
         if (value.indexOf(item.value) > -1) cls = 'dd-selected';
         markup = this._listItemHTML(item, cls);
         contents += markup;
      }

      if (!contents) return '';

      var cls = this._state.isOpen ? '' : 'dd-hidden';
      return '<div class="dd-n dd-bottom ' + cls + '">' + contents + '</div>';
   };

   Dropdown.prototype._listItemHTML = function(item, cls) {
      var contents = '';
      // if (this._state.options.withImg) {
      //    contents += '<div class="dd-n dd-img"></div>';
      // }
      contents = item.text;
      return '<div class="dd-n dd-item ' + cls + '" data-value="' + item.value + '">' +
         contents + '</div>';
   };

   Dropdown.prototype._comboHeadHTML = function(width) {

   };

   Dropdown.prototype._plainHeadHTML = function(width) {
      var value = this.getValue();

      if (value.length > 0 && this._state.options.multiselect) {
         value = this._renderMultiValue(value);
      }
      else if (value.length === 0) {
         value = this._state.placeholder;
      }
      else {
         value = value[0];
      }

      var isOpen = this._state.isOpen;

      var contents = '<div class="dd-n dd-value" style="width: ' + width + 'px">' +
         value + '</div>' +
         '<div class="dd-n dd-arrow dd-' + (isOpen ? 'up': 'down') + '">&rsaquo;</div>';

      return '<div class="dd-n dd-head">' + contents + '</div>';
   };

   Dropdown.prototype._renderMultiValue = function(value) {
      // TODO: this is a bad idea in case values contain commas.
      var contents = '';
      for (var i = 0; i < value.length; i++) {
         var v = value[i];
         contents += '<div class="dd-n dd-v" data-value="' + v + '">' +
            '<div class="dd-n dd-text">' + v + '</div>' +
            '<div class="dd-n dd-delete" data-value="' + v +
            '">&times;</div></div>';
      }
      return contents;
   };

   Dropdown.prototype._injectStyles = function() {
      var linkId = 'dd-css-link';
      if (document.getElementById(linkId)) {
         return true;
      }

      var head  = document.getElementsByTagName('head')[0];
      var link  = document.createElement('link');
      link.id   = linkId;
      link.rel  = 'stylesheet';
      link.type = 'text/css';
      link.href = '../src/dummy-dropdown.css';
      link.media = 'all';
      head.appendChild(link);

   };

   Dropdown.prototype._parseOptionNodes = function(selectNode) {
      var results = [];
      var options = selectNode.options;

      for (var i = 0; i < options.length; i++) {
         var o = options[i];
         results.push({
            'value': o.value,
            'img':   o.getAttribute('data-img'),
            'desc':  o.getAttribute('data-desc'),
            'text':  o.text
         });
      }
      return results;

   };

   // Value getters-setters
   Dropdown.prototype.getValue = function() {
      return this._state.value || [];
   };

   Dropdown.prototype.setValue = function(v) {
      this._state.value = v;
   };

   Dropdown.prototype.val = function(v) {
      return v ? this.setValue(v) : this.getValue();
   };


//// Utilities ////////////////////////////////////////////////////////////////
   function _extendObject(A, B) {
      // Make a copy of A (C) and update keys: C.key = B.key ? B.key : A.key;
      //
      // This function should be used only for plain, one-dimension objects
      // where values are simple primitives (bool, int, str).
      var C = {};
      for (var key in A) {
         if (!A.hasOwnProperty(key)) continue;
         C[key] = A[key];
         if (B.hasOwnProperty(key)) C[key] = B[key];
      }
      return C;
   } // end _extendObject

   function filterNodesByTag(nodes, tag) {
      var results = [];
      for (var i = 0; i < nodes.length; i++) {
         if (nodes[i].tagName.toLowerCase() == tag)
            results.push(nodes[i]);
      };
      return results;
   } // end filterNodesByTag

   function debounce(func, wait, immediate) {
      var timeout;
      return function() {
         var context = this, args = arguments;
         var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
         };
         var callNow = immediate && !timeout;
         clearTimeout(timeout);
         timeout = setTimeout(later, wait);
         if (callNow) func.apply(context, args);
      };
   }; // end debounce

   function hasClass(node, cls) {
      var className = ' ' + cls + ' ';
      return ((' ' + node.className + ' ').replace(/[\n\t]/g, ' ').indexOf(className) > -1);
   } // end hasClass

   function anyParentHasClass(node, cls) {
      if (hasClass(node, cls)) return true;
      if (!node.parentNode) return false;
      return anyParentHasClass(node.parentNode, cls);
   } // end anyParentHasClass

   function findParentOrSelfWithClass(node, cls) {
      if (hasClass(node, cls)) return node;
      var parent = node.parentNode;
      if (!parent) return false;
      if (hasClass(parent, cls)) return parent;
      return findParentWithClass(parent, cls);
   } // end findParentWithClass

   function removeClass(node, cls) {
      var r = new RegExp('\\b' + cls + '\\b', 'g');
      node.className = node.className.replace(r, ' ');
   } // add removeClass

   return DropdownCollection;
///////////////////////////////////////////////////////////////////////////////
})();
