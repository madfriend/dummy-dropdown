var DummyDropdown = (function() {
///////////////////////////////////////////////////////////////////////////////
    var console = console || {log: function() {}};

    function DropdownCollection(selector, options) {
        if (typeof options != 'object') options = {};
        var defaults = {
            multiselect: false,
            combobox: false,
            withImages: true,
            withDesc: true
        };

        this._options = _extendObject(defaults, options);

        var results = [];
        try {
            results = document.querySelectorAll(selector);
        } catch (e) {
            console.log('Check your selector. ' + e);
        }

        var _nodes = filterNodesByTag(results, 'select');
        this.dropdowns = [];
        for (var i = 0; i < _nodes.length; i++) {
            this.dropdowns.push(new Dropdown(_nodes[i], this._options));
        };
    }

    DropdownCollection.prototype.get = function(i) {
        return this.dropdowns[i || 0];
    };

    function Dropdown(selectNode, options) {

    };

    Dropdown.prototype._initState = function() {

    };

    Dropdown.prototype._prepareLayout = function(selectNode) {

    };

    // Value getters-setters
    Dropdown.prototype.getValue = function() {};
    Dropdown.prototype.setValue = function(v) {};
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

    return DropdownCollection;
///////////////////////////////////////////////////////////////////////////////
})();