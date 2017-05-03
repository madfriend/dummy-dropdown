function HTMLLayer(state) {
   this._state = state;
   this._wrapperWidth = 0;
   this._arrowWidth = 25;
   this._lastTailRenderResult = '';
}

HTMLLayer.prototype.initLayout = function(node) {
   var wrapper = document.createElement('div');
   wrapper.tabIndex = 0;

   wrapper.className = 'dd-n dd-wrapper dd-hidden';
   wrapper.style.maxWidth = node.offsetWidth + 'px';

   this._wrapperWidth = node.offsetWidth;

   node.className += ' dd-hidden';
   node.tabIndex = -1;
   node.parentNode.insertBefore(wrapper, node);
   this._wrapper = wrapper;

   return wrapper;
};

HTMLLayer.prototype.render = function(currentValue) {
   console.time('render');
   var wrapper = this._wrapper;
   wrapper.style.display = 'none';

   var markup = '';
   markup += (this._state.options.combobox ?
      this.comboHeadHTML(currentValue) : this.plainHeadHTML(currentValue));

   markup += this.listContentsHTML(currentValue);

   wrapper.innerHTML = markup;

   wrapper.className = 'dd-n dd-wrapper ' +
      (this._state.isFocused ? ' dd-focused' : '') +
      (this._state.isRubbery ? ' dd-rubbery' : '');

   console.timeEnd('render');
   if (this._state.isOpen) setTimeout(this.showImages.bind(this), 0);
   else this._lastTailRenderResult = '';
}

HTMLLayer.prototype.showImages = function() {
   var images = this._wrapper.querySelectorAll('img');
   for (var i = 0; i < images.length; i++) {
      if (!images[i].src) images[i].src = images[i].getAttribute('data-src');
   };
};

HTMLLayer.prototype.renderTail = function(currentValue) {
   // console.time('renderTail');
   var btm = this._wrapper.querySelector('.dd-bottom');
   var newHTML = this.listContentsHTML(currentValue, false);
   if (newHTML === this._lastTailRenderResult) return true;

   btm.innerHTML = newHTML;
   this._lastTailRenderResult = newHTML;

   if (this._state.isOpen) setTimeout(this.showImages.bind(this), 0);
   // console.timeEnd('renderTail');
};

HTMLLayer.prototype.listContentsHTML = function(currentValue, asOuterHTML) {
   if (typeof asOuterHTML === 'undefined') asOuterHTML = true;

   var contents = '';

   if (this._state.isOpen && this._state.visibleItems.length > 0) {
      var item, markup;
      var value = currentValue;

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

         markup = this.listItemHTML(item, cls);
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

HTMLLayer.prototype.listItemHTML = function(item, cls) {
   var tpl = '';
   var contents = '';

   if (this._state.options.withImages && this._state.options.withDesc) {
      tpl = '<div class="dd-n dd-tbl">' +
               '<div class="dd-n dd-img dd-left">' +
                  (item.img ? '<div class="dd-n dd-img"><img data-src="{{src}}"/></div>' : '') +
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
               (item.img ? '<div class="dd-n dd-img"><img data-src="{{src}}"/></div>' : '') +
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

HTMLLayer.prototype.comboHeadHTML = function(currentValue) {
   var value = currentValue;
   var width = this._wrapperWidth - this._arrowWidth;

   var html = '';
   if (this._state.options.multiselect) {
      // if multiple selections are allowed,
      // we have (current values or placeholder) + input if isOpen
      if (this._state.isOpen) {
         html += (value.length > 0 ? this.renderMultiValueHTML(value) : '');
         html += '<input type="text" tabindex="-1" class="dd-input" placeholder="' +
               this._state.placeholder + '"/>';
      }
      else {
         html += (value.length > 0 ? this.renderMultiValueHTML(value) :
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

   var contents = '<div class="dd-n dd-value" style="max-width: ' + width + 'px">' +
      html + '</div>' + '<div class="dd-n dd-arrow dd-' +
      (this._state.isOpen ? 'up': 'down') + '"></div>';

   return '<div class="dd-n dd-head">' + contents + '</div>';
};

HTMLLayer.prototype.plainHeadHTML = function(currentValue) {
   var value = currentValue;
   var width = this._wrapperWidth - this._arrowWidth;

   if (value.length > 0 && this._state.options.multiselect) {
      value = this.renderMultiValueHTML(value);
   }
   else if (value.length === 0) {
      value = this._state.placeholder;
   }
   else {
      value = value[0];
   }

   var isOpen = this._state.isOpen;

   var contents = '<div class="dd-n dd-value" style="max-width: ' + width + 'px">' +
      value + '</div>' +
      '<div class="dd-n dd-arrow dd-' + (isOpen ? 'up': 'down') + '"></div>';

   return '<div class="dd-n dd-head">' + contents + '</div>';
};

HTMLLayer.prototype.renderMultiValueHTML = function(currentValue) {
   var contents = '';
   for (var i = 0; i < currentValue.length; i++) {
      var v = currentValue[i];
      contents += '<div class="dd-n dd-v" data-value="' + v + '">' +
         '<div class="dd-n dd-text">' + v + '</div>' +
         '<div class="dd-n dd-delete" data-value="' + v +
         '">&#10005;</div></div>';
   }
   return contents;
};

module.exports = HTMLLayer;
