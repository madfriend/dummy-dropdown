export function extendObject(A, B) {
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
} // end extendObject

export function filterNodesByTag(nodes, tag) {
   var results = [];
   for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].tagName.toLowerCase() == tag)
         results.push(nodes[i]);
   };
   return results;
} // end filterNodesByTag

export function parseOptionNodes(options) {
   var results = [];

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
}; // end parseOptionNodes

export function debounce(func, wait, immediate) {
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

export function hasClass(node, cls) {
   var className = ' ' + cls + ' ';
   return ((' ' + node.className + ' ').replace(/[\n\t]/g, ' ').indexOf(className) > -1);
} // end hasClass

export function anyParentHasClass(node, cls) {
   if (hasClass(node, cls)) return true;
   if (!node.parentNode) return false;
   return anyParentHasClass(node.parentNode, cls);
} // end anyParentHasClass

export function findParentOrSelfWithClass(node, cls) {
   if (hasClass(node, cls)) return node;
   var parent = node.parentNode;
   if (!parent) return false;
   if (hasClass(parent, cls)) return parent;
   return findParentOrSelfWithClass(parent, cls);
} // end findParentWithClass

export function removeClass(node, cls) {
   var r = new RegExp('\\b' + cls + '\\b', 'g');
   node.className = node.className.replace(r, ' ');
} // add removeClass

export function checkInView(container, element) {
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

export function ajaxGetJSON(url, callback) {
   var xhr;
   var callbackFired = false;

   try {
      xhr = new(this.XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
      xhr.open('GET', url, 1);
      xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = function() {
         xhr.readyState > 3 && callback && callback(JSON.parse(xhr.responseText), xhr);
         callbackFired = true;
      };

      xhr.send();
   } catch (e) {
      console.log(e);
      // try jsonp instead
      if (callbackFired) return;

      var script = document.createElement('script');
      var name = 'f' + Math.random().toString(36).substr(2, 5);
      window[name] = callback;

      script.src = url + '&callback=' + name;
      document.body.appendChild(script);
   }
} // end ajaxGet

export function arrayUnique(array) {
   var keys = Object.create({});
   var out = [];
   for (var i = 0; i < array.length; i++) {
      if (keys[array[i]]) continue;
      keys[array[i]] = 1;
      out.push(array[i]);
   }
   return out;
}
