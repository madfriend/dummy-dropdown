var utils = require('./utils');

function EventLayer(dropdown) {
   this.dropdown = dropdown;
   this._kbdDebounceTimeout = 100;
   this._textInputTimer = 0;

   this._isAddingFocusOnInput = false;
}

EventLayer.prototype.bindEventListeners = function() {
   var wrapper = this.dropdown._wrapper;

   wrapper.addEventListener('mousedown', this.handleClick.bind(this));
   wrapper.addEventListener('keydown', this.handleSpecialKeys.bind(this));
   wrapper.addEventListener('keyup', utils.debounce(
      this.handleTextInput.bind(this), this._kbdDebounceTimeout));

   wrapper.addEventListener('focus', this.handleFocus.bind(this));
   wrapper.addEventListener('blur', this.handleFocusout.bind(this));

   wrapper.addEventListener('mouseover', this.handleMouseover.bind(this));
};


EventLayer.prototype.handleFocus = function(event) {
   // console.log('focus', event);
   var that = this.dropdown;

   if (that._state.isFocused) {
      return false;
   }

   that._state.isFocused = true;
   that._state.isOpen = true;
   that.render();

   if (that._state.options.combobox) this.focusOnInput();

   return false;
};

EventLayer.prototype.handleMouseover = function(event) {
   var that = this.dropdown;
   var tgt = event.target;

   if (utils.anyParentHasClass(tgt, 'dd-item')) {
      tgt = utils.findParentOrSelfWithClass(tgt, 'dd-item');
      event.stopPropagation();
      if (utils.hasClass(tgt, 'dd-hover')) return false;
      var other = that._wrapper.querySelectorAll('.dd-hover');

      for (var i = 0; i < other.length; i++) {
         utils.removeClass(other[i], 'dd-hover');
      }

      tgt.className += ' dd-hover';
   }
};

EventLayer.prototype.handleFocusout = function(event) {
   // console.log('blur - parent', this._state.isAddingFocusOnInput);
   var that = this.dropdown;
   if (this._isAddingFocusOnInput) return false;

   event.stopPropagation();
   that._state.isFocused = false;
   that.close();
   return false;
};

EventLayer.prototype.handleDelete = function(event) {
   // console.log('handleDelete', event.target, event.target.getAttribute('data-value'));
   var del = event.target.getAttribute('data-value');
   var that = this.dropdown;

   var values = that.getValue();
   var index = values.indexOf(del);
   if (index < 0) return false;

   values.splice(index, 1);
   that.setValue(values);

   if (that._state.isOpen) {
      that.close();
   }
   else {
      that._state.visibleItems = that._initVisibleItems();
      that.render();
   }

   return false;
};

EventLayer.prototype.handleClick = function(event) {
   // console.log('click', event);
   var that = this.dropdown;
   event.stopPropagation();
   var tgt = event.target;

   if (utils.anyParentHasClass(tgt, 'dd-item')) {
      tgt = utils.findParentOrSelfWithClass(tgt, 'dd-item');
      if (utils.hasClass(tgt, 'dd-selected')) return false;

      if (!that._state.options.multiselect) {
         that.setValue([tgt.getAttribute('data-value')]);
      } else {
         var v = that.getValue();
         that.setValue(v.concat([tgt.getAttribute('data-value')]));
      }
      that.close();
      return false;
   }

   if (utils.hasClass(tgt, 'dd-delete')) {
      event.preventDefault();
      this.handleDelete(event);
      return false;
   }

   if (utils.hasClass(tgt, 'dd-input')) {
      return false;
      // that._focusOnInput();
   }

   if (utils.hasClass(tgt, 'dd-arrow')) {
      if (that._state.isOpen) return that.close();
   }

   return setTimeout(function() {
      // console.log('setting focus to parent');
      if (!that._state.isFocused) that._wrapper.focus();
   }, 10);
};

EventLayer.prototype.handleInputBlur = function(event) {
   // console.log('blur - input');
   var that = this.dropdown;
   that._state.isFocused = false;
   that.close();
   return false;
};

EventLayer.prototype.handleSpecialKeys = function(event) {
   var specialCodes = [38, 40, 13, 27]; // up, down, enter, esc
   var that = this.dropdown;

   if (specialCodes.indexOf(event.keyCode) >= 0) {
      event.stopImmediatePropagation();
      event.preventDefault();
   } else {
      return false;
   }

   var current = that._wrapper.querySelector('.dd-hover');
   var prev = false;
   var next = false;

   if (current) {
      prev = current.previousElementSibling;
      next = current.nextElementSibling;
   }
   else {
      next = that._wrapper.querySelector('.dd-item');
   }

   switch (event.keyCode) {
      case 38: // up
         return this.handleUpKey(prev, current, next);
         break;

      case 40: // down
         return this.handleDownKey(prev, current, next);
         break;

      case 13: // enter
         return this.handleEnterKey();
         break;

      case 27: // esc
         this.close();
         break;

      default:
         break;
   }
};

EventLayer.prototype.handleUpKey = function(prev, current, next) {
   if (!prev) return false;
   prev.className += ' dd-hover';
   if (!utils.checkInView(prev.parentNode, prev))
      prev.parentNode.scrollTop = prev.offsetTop;

   if (current) utils.removeClass(current, 'dd-hover');
   return false;
};

EventLayer.prototype.handleDownKey = function(prev, current, next) {
   if (!next) return false;
   next.className += ' dd-hover';

   if (!utils.checkInView(next.parentNode, next)) {
      next.parentNode.scrollTop =
         (next.offsetTop - next.parentNode.clientHeight + next.clientHeight);
   }

   if (current) utils.removeClass(current, 'dd-hover');
   return false;
};

EventLayer.prototype.handleEnterKey = function() {
   var that = this.dropdown;
   var active = that._wrapper.querySelector('.dd-hover');
   if (!active) return false;
   if (utils.hasClass(active, 'dd-selected')) return false;

   if (!that._state.options.multiselect) {
      that.setValue([active.getAttribute('data-value')]);
   } else {
      var v = that.getValue();
      that.setValue(v.concat([active.getAttribute('data-value')]));
   }

   that.close();
   return false;
};

EventLayer.prototype.handleTextInput = function(event) {
   var that = this.dropdown;

   if (!that._state.isOpen || !that._state.options.combobox) return false;
   var specialCodes = [38, 40, 13, 27]; // up, down, enter, esc
   if (specialCodes.indexOf(event.keyCode) >= 0) return false;

   var input = that._wrapper.querySelector('.dd-input');
   var val = input.value;
   if (val === that._state.searchQuery) return false;

   window.clearTimeout(this._textInputTimer);

   this._textInputTimer = window.setTimeout(function() {
         that._state.searchQuery = val;
         that._updateVisibleItems(function(visibleItems) {
            that._state.visibleItems = visibleItems;
            that._htmlLayer.renderTail(that.getValue());
         });

      }, 0);

   return false;
};

EventLayer.prototype.focusOnInput = function() {
   var that = this.dropdown;

   var i = that._wrapper.querySelector('.dd-input');
   this._isAddingFocusOnInput = true;

   setTimeout(function() {
      // console.log('setting focus on input');
      i.focus();
      setTimeout(function() { // IE9..
         this._isAddingFocusOnInput = false;
      }.bind(this), 10);

      var v = i.value;
      i.value = '';
      i.value = v;

   }.bind(this), 10);

   return true;
};

module.exports = EventLayer;
