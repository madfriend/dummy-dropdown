if (typeof console === "undefined" ||
    typeof _DROPDOWN_DEBUG === "undefined" ||
    !_DROPDOWN_DEBUG) {
  var console = {log: function() {}, time: function() {}, timeEnd: function() {}};
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
         withImages: false,
         withDesc: false,
         ajaxMatchURL: false
      };

      var _options = _extendObject(defaults, options);
      this._options = _options;

      this._injectStyles();

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

   DropdownCollection.prototype._injectStyles = function() {
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

///////////////////////////////////////////////////////////////////////////////
   function Dropdown(selectNode, options) {
      this._state = {};
      this._initState(selectNode, options);
      this._timer = false;

      this._wrapper = this._prepareLayout(selectNode);
      this.render();
      this._bindEventListeners();
   };

   var arrowWidth = 25;
   var kbdDebounceTimeout = 100;
   var maxResultsLen = 30;

   Dropdown.prototype._initState = function(node, options) {
      this._state.options = options;
      this._state.items = this._parseOptionNodes(node);
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
      if (!this._state.options.combobox) {
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

   Dropdown.prototype._prepareLayout = function(node) {
      var wrapper = document.createElement('div');
      wrapper.tabIndex = 0;

      wrapper.className = 'dd-n dd-wrapper dd-hidden';
      wrapper.style.width = node.offsetWidth + 'px';

      node.className += ' dd-hidden';
      node.tabIndex = -1;
      node.parentNode.insertBefore(wrapper, node);
      // 2. Save a reference to the new wrapper box.
      return wrapper;
   };

   Dropdown.prototype.render = function() {
      // console.time('render');
      // console.log(this._state);
      var wrapper = this._wrapper;
      wrapper.style.display = 'none';
      var ww = parseFloat(wrapper.style.width) - arrowWidth;

      var markup = '';
      markup += (this._state.options.combobox ?
         this._comboHeadHTML(ww) : this._plainHeadHTML(ww));

      markup += this._listContentsHTML();

      wrapper.innerHTML = markup;
      // console.timeEnd('render');

      var i = wrapper.querySelector('.dd-input');
      if (i) i.addEventListener('blur', this._handleInputBlur.bind(this));

      wrapper.className = 'dd-n dd-wrapper ' +
         (this._state.isFocused ? ' dd-focused' : '') +
         (this._state.isRubbery ? ' dd-rubbery' : '');
   };

   Dropdown.prototype._renderTail = function() {
      // console.time('renderTail');
      var btm = this._wrapper.querySelector('.dd-bottom');
      btm.innerHTML = this._listContentsHTML(false);
      // console.timeEnd('renderTail');
   };

   Dropdown.prototype._initSearchIndex = function() {
      // console.time('makeSearchIndex');
      var items = this._state.items;
      var index = this._searchIndex;

      for (var i = 0; i < items.length; i++) {
         index[items[i].value] = [];
         var tokens = items[i].value.split(/\s+/);
         for (var j = 0; j < tokens.length; j++) {
            index[items[i].value] = index[items[i].value].concat(
               allKeyboardLayoutInvariants(tokens[j].toLowerCase()));
         }
      };
      // console.timeEnd('makeSearchIndex');
   };

   Dropdown.prototype._bindEventListeners = function() {
      this._wrapper.addEventListener('mousedown', this._handleClick.bind(this));
      this._wrapper.addEventListener('keydown', this._handleSpecialKeys.bind(this));
      this._wrapper.addEventListener('keyup', debounce(
         this._handleTextInput.bind(this), kbdDebounceTimeout));

      this._wrapper.addEventListener('focus', this._handleFocus.bind(this));
      this._wrapper.addEventListener('blur', this._handleFocusout.bind(this));

      this._wrapper.addEventListener('mouseover', this._handleMouseover.bind(this));
   };

   Dropdown.prototype._handleFocus = function(event) {
      console.log('focus', event);
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
      if (anyParentHasClass(tgt, 'dd-item')) {
         tgt = findParentOrSelfWithClass(tgt, 'dd-item');
         event.stopPropagation();
         if (hasClass(tgt, 'dd-hover')) return false;
         var other = this._wrapper.querySelectorAll('.dd-hover');

         for (var i = 0; i < other.length; i++) {
            removeClass(other[i], 'dd-hover');
         }

         tgt.className += ' dd-hover';
      }
   };

   Dropdown.prototype._handleFocusout = function(event) {
      console.log('blur - parent', this._state.isAddingFocusOnInput);
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

      if (this._state.isOpen) this.close();
      else this.render();
      return false;
   };

   Dropdown.prototype._handleClick = function(event) {
      console.log('click', event);
      event.stopPropagation();
      var tgt = event.target;

      if (anyParentHasClass(tgt, 'dd-item')) {
         tgt = findParentOrSelfWithClass(tgt, 'dd-item');
         if (hasClass(tgt, 'dd-selected')) return false;

         if (!this._state.options.multiselect) {
            this.setValue([tgt.getAttribute('data-value')]);
         } else {
            var v = this.getValue();
            this.setValue(v.concat([tgt.getAttribute('data-value')]));
         }
         this.close();
         return false;
      }

      if (hasClass(tgt, 'dd-delete')) {
         this._handleDelete(event);
         return false;
      }

      if (hasClass(tgt, 'dd-input')) {
         return false;
         // this._focusOnInput();
      }

      return setTimeout(function() {
         console.log('setting focus to parent');
         if (!this._state.isFocused) this._wrapper.focus();
      }.bind(this), 10);

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
   }

   Dropdown.prototype._focusOnInput = function() {
      var i = this._wrapper.querySelector('.dd-input');
      this._state.isAddingFocusOnInput = true;
      setTimeout(function() {
         console.log('setting focus on input');
         i.focus();
         setTimeout(function() { // IE9..
            this._state.isAddingFocusOnInput = false;
         }.bind(this), 10);

         var v = i.value;
         i.value = v;
      }.bind(this), 10);

      return true;
   };

   Dropdown.prototype._handleInputBlur = function(event) {
      console.log('blur - input');
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
            if (!checkInView(prev.parentNode, prev))
               prev.parentNode.scrollTop = prev.offsetTop;

            if (current) removeClass(current, 'dd-hover');
            return false;
            break;

         case 40: // down
            if (!next) return false;
            next.className += ' dd-hover';

            if (!checkInView(next.parentNode, next)) {
               next.parentNode.scrollTop =
                  (next.offsetTop - next.parentNode.clientHeight + next.clientHeight);
            }

            if (current) removeClass(current, 'dd-hover');
            return false;
            break;

         case 13: // enter
            var active = this._wrapper.querySelector('.dd-hover');
            if (!active) return false;
            if (hasClass(active, 'dd-selected')) return false;

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
            this._updateVisibleItems(this._renderTail.bind(this));
         }.bind(this), 0);

      return false;
   };

   Dropdown.prototype._updateVisibleItems = function(callback) {
      // console.time('updateVisible');
      var query = this._state.searchQuery;
      var currentValue = this.getValue();

      if (!query) {
         this._state.visibleItems = this._initVisibleItems();
         return true;
      }

      var l = 0;
      var filtered = [];

      for (var i = 0; i < this._state.items.length; i++) {
         var item = this._state.items[i];
         if (currentValue.indexOf(item.value) >= 0) continue;
         if (this._matchesQuery(item)) {
            l++;
            filtered.push(item);
         }
         if (l >= maxResultsLen) break;
      };
      this._state.visibleItems = filtered;
      // console.timeEnd('updateVisible');
      callback();
      return true;
   };

   Dropdown.prototype._matchesQuery = function(item) {
      var q = this._state.searchQuery;
      var tests = this._searchIndex[item.value] || item.value.split(/\s+/);
      for (var i = 0; i < tests.length; i++) {
         if (startsWith(tests[i], q.toLowerCase())) return true;
      };
      return false;
   };

   Dropdown.prototype._listContentsHTML = function(asOuterHTML) {
      if (typeof asOuterHTML === 'undefined') asOuterHTML = true;

      var contents = '';

      if (this._state.isOpen && this._state.visibleItems.length > 0) {
         var item, markup;
         var value = this.getValue();

         var foundFirstActive = false;
         for (var i = 0; i < this._state.visibleItems.length; i++) {
            item = this._state.visibleItems[i];
            var cls = '';
            var selected = value.indexOf(item.value) > -1;

            if (!foundFirstActive && !selected) {
               cls = 'dd-hover';
               foundFirstActive = true;
            }
            if (selected) cls = 'dd-selected';

            markup = this._listItemHTML(item, cls);
            contents += markup;
         }
      }

      if (this._state.isOpen && this._state.visibleItems.length === 0) {
         contents = '<div class="dd-n dd-not-found">Ничего не найдено</div>';
      }

      if (!asOuterHTML) return contents;

      var cls = this._state.isOpen ? '' : 'dd-hidden';
      return '<div class="dd-n dd-bottom ' + cls + '">' + contents + '</div>';
   };

   Dropdown.prototype._listItemHTML = function(item, cls) {
      var tpl = '';
      var contents = '';

      if (this._state.options.withImages && this._state.options.withDesc) {
         tpl = '<div class="dd-n dd-tbl">' +
                  '<div class="dd-n dd-img dd-left">' +
                     (item.img ? '<div class="dd-n dd-img"><img src="{{src}}"/></div>' : '') +
                  '</div>' +
                  '<div class="dd-n dd-right">' +
                     '<div class="dd-n dd-t">{{text}}</div>' +
                     '<div class="dd-n dd-desc">{{desc}}</div>' +
                  '</div>' +
               '</div>';
      }

      else if (this._state.options.withImages && !this._state.options.withDesc) {
         tpl = '<div class="dd-n dd-tbl">' +
                  '<div class="dd-n dd-img dd-left">' +
                  (item.img ? '<div class="dd-n dd-img"><img src="{{src}}"/></div>' : '') +
                  '</div>' +
                  '<div class="dd-n dd-right">' +
                     '<div class="dd-n dd-t">{{text}}</div>' +
                  '</div>' +
               '</div>';
      }

      else if (this._state.options.withDesc) {
         tpl = '<div class="dd-n">' +
                  '<div class="dd-n dd-t">{{text}}</div>' +
                  '<div class="dd-n dd-desc">{{desc}}</div>' +
               '</div>';
      }
      else {
         tpl = '<div class="dd-n">' +
                  '<div class="dd-n dd-t">{{text}}</div>' +
               '</div>';
      }

      contents = tpl.replace('{{text}}', item.text)
                    .replace('{{desc}}', item.desc)
                    .replace('{{src}}', item.img);

      return '<div class="dd-n dd-item ' + cls + '" data-value="' + item.value + '">' +
         contents + '</div>';
   };

   Dropdown.prototype._comboHeadHTML = function(width) {
      var value = this.getValue();

      var html = '';
      if (this._state.options.multiselect) {
         // if multiple selections are allowed,
         // we have (current values or placeholder) + input if isOpen
         if (this._state.isOpen) {
            html += (value.length > 0 ? this._renderMultiValue(value) : '');
            html += '<input type="text" tabindex="-1" class="dd-input" placeholder="' +
                  this._state.placeholder + '"/>';
         }
         else {
            html += (value.length > 0 ? this._renderMultiValue(value) :
               this._state.placeholder);
         }
      }
      else {
         // if only one selection is allowed,
         // we have an input ifOpen else value/placeholder
         if (this._state.isOpen) {
            html += '<input type="text" tabindex="-1" class="dd-input" ' +
               'placeholder="' + this._state.placeholder + '" ' +
               (value.length > 0 ? 'value="' + value[0] + '"' : '') + '/>';
         }
         else {
            html += (value.length > 0 ? value[0] : this._state.placeholder);
         }
      }

      var contents = '<div class="dd-n dd-value" style="width: ' + width + 'px">' +
         html + '</div>' + '<div class="dd-n dd-arrow dd-' +
         (this._state.isOpen ? 'up': 'down') + '">&rsaquo;</div>';

      return '<div class="dd-n dd-head">' + contents + '</div>';
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

   Dropdown.prototype._parseOptionNodes = function(selectNode) {
      var results = [];
      var options = selectNode.options;

      for (var i = 0; i < options.length; i++) {
         var o = options[i];
         results.push({
            'value': o.value,
            'img':   o.getAttribute('data-img') || false,
            'desc':  o.getAttribute('data-desc') || '',
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
      return findParentOrSelfWithClass(parent, cls);
   } // end findParentWithClass

   function removeClass(node, cls) {
      var r = new RegExp('\\b' + cls + '\\b', 'g');
      node.className = node.className.replace(r, ' ');
   } // add removeClass

   function checkInView(container, element) {
      // Get container properties
      var cTop = container.scrollTop;
      var cBottom = cTop + container.clientHeight;

      // Get element properties
      var eTop = element.offsetTop;
      var eBottom = eTop + element.clientHeight;

      // Check if in view
      var is = (eTop >= cTop && eBottom <= cBottom);
      return is;
   } // end checkInView

   function startsWith(haystack, needle) {
      return haystack.lastIndexOf(needle, 0) === 0;
   } // end startsWith

   function allKeyboardLayoutInvariants(word) {
      return [word, swapLayout(word),
         translit(word), swapLayout(translit(word))];
   } // end allKeyboardVariants

   var enru = [
      'qй', 'wц', 'eу', 'rк', 'tе', 'yн', 'uг', 'iш', 'oщ', 'pз', '[х', '{Х',
      ']ъ', '}Ъ', '|/', '`ё', '~Ё', 'aф', 'sы', 'dв', 'fа', 'gп', 'hр', 'jо',
      'kл', 'lд', ';ж', ':Ж', "'э", '"Э', 'zя', 'xч', 'cс', 'vм', 'bи', 'nт',
      'mь', ',б', '<Б', '.ю', '>Ю', '/.', '?, ', '@"', '#№', '$;', '^:', '&?'
   ];
   var layoutMap = {};
   for (var i = 0; i < enru.length; i++) {
      layoutMap[enru[i][0]] = enru[i][1];
      layoutMap[enru[i][1]] = enru[i][0];
   };

   function swapLayout(word) {
      var out = '';
      for (var i = 0; i < word.length; i++)
         out += (layoutMap[word[i]] || word[i]);
      return out;
   }

   var translitMap = [
      'щ ш ч ц ю я ё ж ъ ы э а б в г д е з и й к л м н о п р с т у ф х ь'.split(' '),
      "shh sh ch cz yu ya yo zh `` y' e` a b v g d e z i j k l m n o p r s t u f x `".split(' ')
   ];

   function translit(word) {
      // detect lang
      var ruMatches = 0;
      var enMatches = 0;

      for (var i = 0; i < translitMap[0].length; i++)
         ruMatches += (word.indexOf(translitMap[0][i]) >= 0 ? 1 : 0);
      for (var j = 0; j < translitMap[1].length; j++)
         enMatches += (word.indexOf(translitMap[1][j]) >= 0 ? 1 : 0);

      var engToRus = (enMatches > ruMatches);
      var rus = translitMap[0], eng = translitMap[1];

      for(var x = 0; x < rus.length; x++) {
         word = word.split(engToRus ? eng[x] : rus[x]).join(engToRus ? rus[x] : eng[x]);
         word = word.split(engToRus ? eng[x].toUpperCase() : rus[x].toUpperCase()).join(engToRus ? rus[x].toUpperCase() : eng[x].toUpperCase());
      }
      return word;
   } // end translit

   return DropdownCollection;
///////////////////////////////////////////////////////////////////////////////
})();
