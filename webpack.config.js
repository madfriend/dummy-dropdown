var webpack = require('webpack');

module.exports = {
   entry: './src/entry-point.js',
   output: {
      path: __dirname + '/dist',
      filename: 'dummy-dropdown.min.js',
      library: 'DummyDropdown',
   },
   plugins: [
      // new webpack.optimize.UglifyJsPlugin({minimize: true})
   ],
   module: {
      loaders: [
         {
            test: /\.css$/,
            loader: "style-loader!css-loader"
         }
      ]
   }
};
