const CleanWebpackPlugin = require('clean-webpack-plugin')
const path = require('path');

module.exports = {
  entry: ['babel-polyfill', './src/main.js'],
  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: 'bundle.js'
  },
  module: {
    rules: [{
        test: /\.js$/,
        exclude: /node_modules/,
        loader: "babel-loader"
      },
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            name: 'Calculator.[hash].js'
          }
        },
      }
    ]
  },
  devtool: 'source-map',
  plugins: [
    new CleanWebpackPlugin(['docs/*.js', 'docs/*.js.map'], {})
  ]
};
