var DummyDropdown = (function defineClass() {
///////////////////////////////////////////////////////////////////////////////
    function Dropdown(options) {
        if (typeof options != 'object') options = {};
        var defaults = {
            multiselect: false,
            combobox: false,
            withPictures: true
        };

        this._options = _extendObject(defaults, options);
    }

//// Utilities ////////////////////////////////////////////////////////////////
    function _extendObject(A, B) {
        // Make a copy of A (C) and update keys: C.key = B.key ? B.key : A.key;
        //
        // This function should be used only for plain, one-dimension objects
        // where values are simple primitives (bool, int, str).
        var C = {};
        for (key in A) {
            if (!A.hasOwnProperty(key)) continue;
            C[key] = A[key];
            if (B.hasOwnProperty(key)) C[key] = B[key];
        }
        return C;
    }

    return Dropdown;
//// end defineClass //////////////////////////////////////////////////////////
})();