const { resolve } = require('path')
const isDev = process.env.NODE_ENV !== 'production'
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const webpack = require('webpack')
const { VueLoaderPlugin } = require('vue-loader')

const cssLoaders = (preNumber) => [
  isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
  {
    loader: 'css-loader',
    options: {
      sourceMap: isDev,
      importLoaders: preNumber + 1,
    },
  },
  {
    loader: 'postcss-loader',
    options: {
      postcssOptions: {
        plugins: [
          'postcss-flexbugs-fixes',
          [
            'postcss-preset-env',
            {
              autoprefixer: {
                grid: true,
                flexbox: 'no-2009',
              },
            },
          ],
          'postcss-normalize',
        ],
      },
      sourceMap: isDev,
    },
  },
]

const source = resolve(__dirname, '../src')
const output = resolve(__dirname, '../dist')

module.exports = {
  entry: {
    app: [resolve(source, 'index.js'), resolve(source, 'order5.js')],
  },
  output: {
    filename: `js/[name]${isDev ? '' : '.[contenthash:8]'}.js`,
    path: output,
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.json'],
  },
  externals: {},
  plugins: [
    new webpack.DefinePlugin({
      process: {
        env: {},
      },
    }),
    new VueLoaderPlugin(),
  ],
  module: {
    rules: [
      {
        test: /.js$/,
        loader: 'babel-loader',
        options: { cacheDirectory: true },
        exclude: (file) => /node_modules/.test(file) && !/\.vue\.js/.test(file),
      },
      {
        test: /.vue$/,
        use: 'vue-loader',
      },
      {
        test: /\.css$/,
        use: cssLoaders(0),
      },
      {
        test: /\.scss$/,
        use: [
          ...cssLoaders(1),
          {
            loader: 'sass-loader',
            options: {
              sourceMap: isDev,
            },
          },
        ],
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/],
        type: 'asset/inline',
      },
      {
        test: /\.(ttf|woff|woff2|eot|otf)$/,
        type: 'asset/inline',
      },
    ],
  },
}
