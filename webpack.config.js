const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { InjectManifest } = require('workbox-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    entry: './index.web.tsx',
    output: {
      path: path.resolve(__dirname, 'web-build'),
      filename: isDev ? '[name].js' : '[name].[contenthash].js',
      publicPath: '/',
      globalObject: 'this',
      environment: {
        // This tells webpack that the target environment supports these features
        // But we still need to provide fallbacks for missing globals
        arrowFunction: true,
        bigIntLiteral: false,
        const: true,
        destructuring: true,
        dynamicImport: false,
        forOf: true,
        module: true,
      },
    },
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-source-map' : 'source-map',
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'public'),
        },
        {
          directory: path.join(__dirname, 'android/app/src/main/assets'),
          publicPath: '/assets',
        },
      ],
      historyApiFallback: true,
      hot: true,
      port: 3001,
      open: true,
      proxy: [
        {
          context: ['/github-proxy'],
          target: 'https://raw.githubusercontent.com',
          pathRewrite: { '^/github-proxy': '' },
          changeOrigin: true,
          secure: true,
        },
      ],
      setupMiddlewares: (middlewares, devServer) => {
        // Ensure manifest.json is served with correct MIME type
        devServer.app.get('/manifest.json', (req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.sendFile(path.join(__dirname, 'public', 'manifest.json'));
        });

        // Generic CORS proxy for cross-origin requests
        // Handle OPTIONS preflight requests
        devServer.app.options('/cors-proxy', (req, res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, PUT, DELETE, OPTIONS',
          );
          res.setHeader(
            'Access-Control-Allow-Headers',
            'Content-Type, Authorization, Referrer-Policy',
          );
          res.sendStatus(200);
        });

        // Handle all HTTP methods for CORS proxy
        devServer.app.all('/cors-proxy', async (req, res) => {
          const { url } = req.query;

          // eslint-disable-next-line no-console
          console.log('[CORS Proxy] Request:', {
            method: req.method,
            url,
            headers: req.headers,
          });

          if (!url || typeof url !== 'string') {
            // eslint-disable-next-line no-console
            console.error('[CORS Proxy] Missing URL parameter');
            return res
              .status(400)
              .json({ error: 'Missing or invalid url parameter' });
          }

          try {
            // Use dynamic import for node-fetch if available, otherwise use native fetch
            let fetchImpl;
            try {
              const nodeFetch = await import('node-fetch');
              fetchImpl = nodeFetch.default || nodeFetch;
            } catch {
              // Use native fetch (Node 18+)
              fetchImpl = fetch;
            }

            // Forward the original request method and body
            const fetchOptions = {
              method: req.method === 'OPTIONS' ? 'GET' : req.method,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              },
            };

            // Copy relevant headers from original request
            if (req.headers['content-type']) {
              fetchOptions.headers['Content-Type'] =
                req.headers['content-type'];
            }

            // Forward body for POST, PUT, PATCH requests
            if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
              fetchOptions.body =
                typeof req.body === 'string'
                  ? req.body
                  : JSON.stringify(req.body);
            }

            // eslint-disable-next-line no-console
            console.log('[CORS Proxy] Fetching:', url, fetchOptions);
            const response = await fetchImpl(url, fetchOptions);
            // eslint-disable-next-line no-console
            console.log(
              '[CORS Proxy] Response:',
              response.status,
              response.statusText,
            );

            // Copy headers from the target response
            const contentType = response.headers.get('content-type');
            if (contentType) {
              res.setHeader('Content-Type', contentType);
            }

            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader(
              'Access-Control-Allow-Methods',
              'GET, POST, PUT, DELETE, OPTIONS',
            );
            res.setHeader(
              'Access-Control-Allow-Headers',
              'Content-Type, Authorization, Referrer-Policy',
            );

            // Get response body
            const buffer = Buffer.from(await response.arrayBuffer());
            // eslint-disable-next-line no-console
            res.send(buffer);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('[CORS proxy error]:', error);
            res.status(500).json({
              error: 'Failed to fetch from target URL',
              details: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        });

        return middlewares;
      },
    },
    resolve: {
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.web.jsx',
        '.web.js',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
      ],
      fullySpecified: false,
      mainFields: ['browser', 'module', 'main'],
      alias: {
        'react-native$': path.resolve(__dirname, 'shims/react-native.web.js'),
        'react-native-reanimated$': path.resolve(
          __dirname,
          'shims/react-native-reanimated.web.js',
        ),
        '@gorhom/bottom-sheet': path.resolve(
          __dirname,
          'shims/gorhom-bottom-sheet.web.js',
        ),
        'react-native-tab-view': path.resolve(
          __dirname,
          'shims/react-native-tab-view.web.js',
        ),
        'react-native-mmkv': path.resolve(
          __dirname,
          'shims/react-native-mmkv.web.ts',
        ),
        'react-native-lottie-splash-screen': path.resolve(
          __dirname,
          'shims/react-native-lottie-splash-screen.web.ts',
        ),
        'react-native-background-actions': path.resolve(
          __dirname,
          'shims/react-native-background-actions.web.ts',
        ),
        '@react-native-google-signin/google-signin': path.resolve(
          __dirname,
          'shims/react-native-google-signin.web.ts',
        ),
        '@react-native-documents/picker': path.resolve(
          __dirname,
          'shims/react-native-documents-picker.web.ts',
        ),
        '@react-native-vector-icons/get-image': path.resolve(
          __dirname,
          'shims/react-native-vector-icons-get-image.web.js',
        ),
        '@react-native-cookies/cookies': path.resolve(
          __dirname,
          'shims/react-native-cookies.web.ts',
        ),
        'react-native-reanimated/scripts/validate-worklets-version':
          path.resolve(
            __dirname,
            'shims/reanimated-validate-worklets-version.web.js',
          ),
        'expo-sqlite': path.resolve(__dirname, 'shims/expo-sqlite.web.ts'),
        'expo-notifications': path.resolve(
          __dirname,
          'shims/expo-notifications.web.ts',
        ),
        'react-native-webview$': path.resolve(
          __dirname,
          'shims/react-native-webview.web.js',
        ),
        '@services/backup/drive$': path.resolve(
          __dirname,
          'src/services/backup/drive/index.web.ts',
        ),
        '@services/backup/local$': path.resolve(
          __dirname,
          'src/services/backup/local/index.web.ts',
        ),
        './backup/local$': path.resolve(
          __dirname,
          'src/services/backup/local/index.web.ts',
        ),
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
        'react-native-vector-icons/MaterialCommunityIcons':
          '@react-native-vector-icons/material-design-icons',
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
        // Apply exports polyfill loader ONLY to @react-navigation packages
        {
          test: /\.(js|jsx|mjs)$/,
          include: /@react-navigation/,
          enforce: 'pre',
          use: {
            loader: path.resolve(
              __dirname,
              'webpack-loaders/exports-polyfill-loader.js',
            ),
          },
        },
        {
          test: /\.(ts|tsx|js|jsx)$/,
          exclude: filepath => {
            // Allow transpiling these packages even though they're in node_modules
            const allowedPackages = [
              '@gorhom',
              'react-native-reanimated',
              'react-native-worklets',
              'react-native-gesture-handler',
              'react-native-shimmer-placeholder',
              'react-native-error-boundary',
              '@legendapp',
              '@expo',
              '@cd-z',
              '@react-navigation',
              'expo',
              'react-native-paper',
              'react-native-vector-icons',
            ];
            if (/node_modules/.test(filepath)) {
              return !allowedPackages.some(pkg => filepath.includes(pkg));
            }
            return /src-sw\.js$/.test(filepath);
          },
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    modules: false, // Let webpack handle module transformation
                    targets: {
                      browsers: ['last 2 versions', 'not dead', '> 0.2%'],
                    },
                  },
                ],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript',
              ],
              plugins: [
                [
                  '@babel/plugin-transform-runtime',
                  {
                    regenerator: true,
                  },
                ],
                ['@babel/plugin-transform-class-properties', { loose: true }],
                ['@babel/plugin-transform-private-methods', { loose: true }],
                [
                  '@babel/plugin-transform-private-property-in-object',
                  { loose: true },
                ],
                [
                  'babel-plugin-module-resolver',
                  {
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
                      '@react-native-google-signin/google-signin':
                        './shims/react-native-google-signin.web.ts',
                      'react-native-vector-icons/MaterialCommunityIcons':
                        '@react-native-vector-icons/material-design-icons',
                    },
                  },
                ],
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
      new CopyWebpackPlugin({
        patterns: [
          { from: 'public/fonts', to: 'fonts' },
          { from: 'public/manifest.json', to: 'manifest.json' },
          { from: 'public/sql-wasm.wasm', to: 'sql-wasm.wasm' },
          // Copy icon files for PWA
          { from: 'public/apple-touch-icon.png', to: 'apple-touch-icon.png' },
          { from: 'public/favicon.ico', to: 'favicon.ico' },
          { from: 'public/favicon-16x16.png', to: 'favicon-16x16.png' },
          { from: 'public/favicon-32x32.png', to: 'favicon-32x32.png' },
          { from: 'public/icon-192x192.png', to: 'icon-192x192.png' },
          { from: 'public/icon-512x512.png', to: 'icon-512x512.png' },
          { from: 'public/screenshot-1.png', to: 'screenshot-1.png' },
          { from: 'android/app/src/main/assets', to: 'assets' },
        ],
      }),
      new webpack.DefinePlugin({
        __DEV__: JSON.stringify(isDev),
        'process.env.NODE_ENV': JSON.stringify(
          isDev ? 'development' : 'production',
        ),
        'process.env.EXPO_OS': JSON.stringify('web'),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(
          process.env.GOOGLE_CLIENT_ID || '',
        ),
      }),
      new webpack.ProvidePlugin({
        process: 'process/browser',
      }),
      new webpack.ProvidePlugin({
        'React.unstable_batchedUpdates': [
          'react-dom',
          'unstable_batchedUpdates',
        ],
      }),
      // Replace ALL imports that resolve to react-native-reanimated's Easing.js
      new webpack.NormalModuleReplacementPlugin(
        /[\\/]react-native-reanimated[\\/]lib[\\/]module[\\/]Easing\.js$/,
        path.resolve(__dirname, 'shims/reanimated-easing.web.js'),
      ),
      new webpack.NormalModuleReplacementPlugin(
        /react-native$/,
        // eslint-disable-next-line no-unused-vars
        resource => {
          // Only replace if it's trying to import specific missing exports
          // react-native-web is used as the primary implementation
        },
      ),
      ...(!isDev
        ? [
            new InjectManifest({
              swSrc: './src-sw.js',
              swDest: 'service-worker.js',
            }),
          ]
        : []),
    ],
    ignoreWarnings: [
      /Failed to parse source map/,
      /Critical dependency: require function is used in a way/,
      /BABEL_SHOW_CONFIG_FOR/,
    ],
  };
};
