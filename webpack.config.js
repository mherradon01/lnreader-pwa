const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './index.web.tsx',
    output: {
      path: path.resolve(__dirname, 'web-build'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      publicPath: '/',
    },
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-source-map' : 'source-map',
    devServer: {
      static: {
        directory: path.join(__dirname, 'public'),
      },
      historyApiFallback: true,
      hot: true,
      port: 3000,
      open: true,
    },
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs'],
      fullySpecified: false,
      alias: {
        'react-native$': 'react-native-web',
        'react-native-mmkv': path.resolve(__dirname, 'shims/react-native-mmkv.web.ts'),
        'react-native-lottie-splash-screen': path.resolve(__dirname, 'shims/react-native-lottie-splash-screen.web.ts'),
        'react-native-background-actions': path.resolve(__dirname, 'shims/react-native-background-actions.web.ts'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@database': path.resolve(__dirname, 'src/database'),
        '@hooks': path.resolve(__dirname, 'src/hooks'),
        '@screens': path.resolve(__dirname, 'src/screens'),
        '@strings': path.resolve(__dirname, 'strings'),
        '@services': path.resolve(__dirname, 'src/services'),
        '@plugins': path.resolve(__dirname, 'src/plugins'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@theme': path.resolve(__dirname, 'src/theme'),
        '@navigators': path.resolve(__dirname, 'src/navigators'),
        '@api': path.resolve(__dirname, 'src/api'),
        '@type': path.resolve(__dirname, 'src/type'),
        '@specs': path.resolve(__dirname, 'specs'),
        'react-native-vector-icons/MaterialCommunityIcons': '@react-native-vector-icons/material-design-icons',
      },
      fallback: {
        'crypto': false,
        'stream': false,
        'buffer': false,
        'util': false,
        'assert': false,
        'http': false,
        'https': false,
        'os': false,
        'url': false,
        'zlib': false,
        'fs': false,
        'path': false,
      },
    },
    module: {
      rules: [
        {
          test: /\.m?js$/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-env',
                '@babel/preset-react',
                '@babel/preset-typescript',
              ],
              plugins: [
                ['@babel/plugin-transform-runtime'],
                ['babel-plugin-module-resolver', {
                  alias: {
                    '@components': './src/components',
                    '@database': './src/database',
                    '@hooks': './src/hooks',
                    '@screens': './src/screens',
                    '@strings': './strings',
                    '@services': './src/services',
                    '@plugins': './src/plugins',
                    '@utils': './src/utils',
                    '@theme': './src/theme',
                    '@navigators': './src/navigators',
                    '@api': './src/api',
                    '@type': './src/type',
                    '@specs': './specs',
                    'react-native-vector-icons/MaterialCommunityIcons': '@react-native-vector-icons/material-design-icons',
                  },
                }],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|ttf|otf|woff|woff2|eot)$/,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        favicon: './public/favicon.ico',
      }),
      ...(!isDev ? [
        new InjectManifest({
          swSrc: './src-sw.js',
          swDest: 'service-worker.js',
        }),
      ] : []),
    ],
    ignoreWarnings: [
      /Failed to parse source map/,
      /BABEL_SHOW_CONFIG_FOR/,
    ],
  };
};
