const path = require('path');
const webpack = require('webpack');
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
      setupMiddlewares: (middlewares, devServer) => {
        // Ensure manifest.json is served with correct MIME type
        devServer.app.get('/manifest.json', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
        });
        return middlewares;
      },
    },
    resolve: {
      extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js', '.mjs'],
      fullySpecified: false,
      alias: {
        'react-native$': path.resolve(__dirname, 'shims/react-native.web.js'),
        'react-native-mmkv': path.resolve(__dirname, 'shims/react-native-mmkv.web.ts'),
        'react-native-lottie-splash-screen': path.resolve(__dirname, 'shims/react-native-lottie-splash-screen.web.ts'),
        'react-native-background-actions': path.resolve(__dirname, 'shims/react-native-background-actions.web.ts'),
        '@react-native-documents/picker': path.resolve(__dirname, 'shims/react-native-documents-picker.web.ts'),
        '@react-native-vector-icons/get-image': path.resolve(__dirname, 'shims/react-native-vector-icons-get-image.web.js'),
        'expo-sqlite': path.resolve(__dirname, 'shims/expo-sqlite.web.ts'),
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
          exclude: [
            /src-sw\.js$/,
          ],
          include: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, 'specs'),
            path.resolve(__dirname, 'shims'),
            path.resolve(__dirname, 'strings'),
            path.resolve(__dirname, 'App.tsx'),
            path.resolve(__dirname, 'App.web.tsx'),
            path.resolve(__dirname, 'index.web.tsx'),
            /node_modules\/@gorhom/,
            /node_modules\/react-native-reanimated/,
            /node_modules\/react-native-gesture-handler/,
            /node_modules\/react-native-shimmer-placeholder/,
            /node_modules\/react-native-error-boundary/,
            /node_modules\/@legendapp/,
            /node_modules\/@expo/,
            /node_modules\/@cd-z/,
            /node_modules\/@react-navigation/,
            /node_modules\/expo/,
            /node_modules\/expo-sqlite/,
            /node_modules\/expo-notifications/,
            /node_modules\/expo-navigation-bar/,
            /node_modules\/expo-keep-awake/,
            /node_modules\/expo-linear-gradient/,
            /node_modules\/expo-modules-core/,
            /node_modules\/expo-linking/,
            /node_modules\/expo-clipboard/,
            /node_modules\/expo-haptics/,
            /node_modules\/expo-localization/,
            /node_modules\/expo-speech/,
            /node_modules\/expo-web-browser/,
            /node_modules\/expo-file-system/,
            /node_modules\/expo-document-picker/,
          ],
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
                ['@babel/plugin-transform-class-properties', { loose: true }],
                ['@babel/plugin-transform-private-methods', { loose: true }],
                ['@babel/plugin-transform-private-property-in-object', { loose: true }],
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
        inject: 'body',
        scriptLoading: 'defer',
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(isDev),
        'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production'),
        'process.env.EXPO_OS': JSON.stringify('web'),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new webpack.ProvidePlugin({
        'React.unstable_batchedUpdates': ['react-dom', 'unstable_batchedUpdates'],
      }),
      new webpack.NormalModuleReplacementPlugin(
        /react-native$/,
        (resource) => {
          // Only replace if it's trying to import specific missing exports
          if (resource.request === 'react-native' && resource.context.includes('node_modules')) {
            const polyfills = path.resolve(__dirname, 'shims/react-native-polyfills.web.ts');
            // We still want to use react-native-web for most things
            // but provide fallbacks for missing exports
          }
        }
      ),
      ...(!isDev ? [
        new InjectManifest({
          swSrc: './src-sw.js',
          swDest: 'service-worker.js',
        }),
      ] : []),
    ],
    ignoreWarnings: [
      /Failed to parse source map/,
      /Critical dependency: require function is used in a way/,
      /BABEL_SHOW_CONFIG_FOR/,
    ],
  };
};
