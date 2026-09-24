const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (_env, argv = {}) => {
  const isProd = argv.mode === 'production';

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    entry: './src/renderer/index.tsx',
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'renderer.bundle.js',
      chunkFilename: '[name].chunk.js',
      publicPath: 'auto',
      uniqueName: 'sgc_desktop_renderer',
      hotUpdateGlobal: 'webpackHotUpdate_sgc_desktop_renderer',
      clean: true,
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      symlinks: false,
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
              onlyCompileBundledFiles: true,
              compilerOptions: {
                module: 'esnext',
              },
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          // Assets de marca (logo Innovax de la Demo guiada). Se incrustan como
          // data URI para que funcionen igual con webpack-dev-server y con el
          // index.html cargado por file:// en la app empaquetada. Solo aplica a
          // src/renderer/assets y queda en el chunk lazy de la demo.
          test: /\.(png|jpe?g|svg)$/i,
          include: path.resolve(__dirname, 'src/renderer/assets'),
          type: 'asset/inline',
        },
        {
          // Narracion pregenerada de la Demo guiada: archivos locales (sin
          // internet durante la presentacion). Se emiten junto al bundle.
          test: /\.(mp3|ogg|wav)$/i,
          include: path.resolve(__dirname, 'src/renderer/assets/demo-audio'),
          type: 'asset/resource',
          generator: { filename: 'demo-audio/[name][ext]' },
        },
      ],
    },
    optimization: {
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/renderer/index.html'),
        filename: 'index.html',
        inject: 'body',
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'src/renderer'),
      },
      host: '0.0.0.0',
      allowedHosts: 'all',
      port: 3002,
      hot: true,
      liveReload: true,
      historyApiFallback: true,
    },
  };
};
