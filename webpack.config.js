const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    entry: './src/dummy-dropdown.js',
    output: {
        path: './dist',
        filename: 'dummy-dropdown.min.js'
    },
    plugins: [new UglifyJSPlugin()]
};