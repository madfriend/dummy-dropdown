var utilsStr = require('./utils-string');
var utils = require('./utils');

function SearchLayer(items, ajaxSearchURL) {
   this.items = items;
   this._ajaxSearchURL = ajaxSearchURL;
   this._maxResultsLen = 30;
   this.searchIndex = {};
}

SearchLayer.prototype.scheduleIndexBuild = function() {
   setTimeout(this.buildSearchIndex.bind(this), 0);
}

SearchLayer.prototype.buildSearchIndex = function() {
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

   var items = this.items;
   var index = this.searchIndex;

   for (var i = 0; i < items.length; i++) {
      index[items[i].value] = [];
      var all_ngrams = utilsStr.allPossibleTokens(items[i].value);
      for (var j = 0; j < all_ngrams.length; j++) {
         index[items[i].value] = index[items[i].value].concat(
            utilsStr.allKeyboardLayoutInvariants(all_ngrams[j].toLowerCase()));
      }
   };
   // console.timeEnd('makeSearchIndex');
}

SearchLayer.prototype.initVisibleItems = function(currentValue) {
   var out = [];
   var value = currentValue;
   var found = 0;

   for (var i = 0; i < this.items.length; i++) {
      var item = this.items[i];
      if (value.indexOf(item.value) >= 0) continue;
      out.push(item);
      found++;
      if (found >= this._maxResultsLen) break;
   }

   return out;
};

SearchLayer.prototype.getVisibleItems = function(query, currentValue, callback) {
   var visibleItems = [];

   function filterItems(query, whitelist) {
      var l = 0;
      var filtered = [];

      for (var i = 0; i < this.items.length; i++) {
         var item = this.items[i];
         if (currentValue.indexOf(item.value) >= 0) continue;
         if (whitelist.indexOf(item.value) >= 0 || this.matchesQuery(item, query)) {
            l++;
            filtered.push(item);
         }
         if (l >= this._maxResultsLen) break;
      };
      return filtered;
   };

   filterItems = filterItems.bind(this);

   if (this._ajaxSearchURL) {
      this.searchItemsOnServer(query, function(results) {
         visibleItems = filterItems(query, results);
         callback(visibleItems);
      });

   }
   else {
      visibleItems = filterItems(query, []);
      callback(visibleItems);
   }

   // console.timeEnd('updateVisible');
   return visibleItems;
};

SearchLayer.prototype.searchItemsOnServer = function(query, callback) {
   var queries = utilsStr.allKeyboardLayoutInvariants(query);
   var qs = [];
   for (var i = 0; i < queries.length; i++) {
      qs.push('query=' + encodeURIComponent(queries[i]));
   }

   utils.ajaxGetJSON(this._ajaxSearchURL + '?' + qs.join('&'),
      callback);
};

SearchLayer.prototype.matchesQuery = function(item, query) {
   var tests = this.searchIndex[item.value] || item.value.split(/\s+/);
   for (var i = 0; i < tests.length; i++) {
      if (utilsStr.startsWith(tests[i], query.toLowerCase())) return true;
   };
   return false;
};


module.exports = SearchLayer;
