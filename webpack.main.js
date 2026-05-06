const path = require('path');

module.exports = (_env, argv = {}) => {
  const isProd = argv.mode === 'production';

  return {
    mode: isProd ? 'production' : 'development',
    devtool: isProd ? false : 'eval-cheap-module-source-map',
    cache: {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
    },
    entry: {
      main: './src/main/main.ts',
      preload: './src/main/preload.ts',
    },
    target: 'electron-main',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: (pathData) => (pathData.chunk && pathData.chunk.name === 'preload' ? 'preload.js' : 'main.bundle.js'),
      uniqueName: 'sgc_desktop_main',
    },
    resolve: {
      extensions: ['.ts', '.js'],
      symlinks: false,
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
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
      ],
    },
    optimization: {
      moduleIds: 'deterministic',
      chunkIds: 'deterministic',
    },
    externals: {
      sqlite3: 'commonjs sqlite3',
      msnodesqlv8: 'commonjs msnodesqlv8',
      'mssql/msnodesqlv8': 'commonjs mssql/msnodesqlv8',
    },
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};
