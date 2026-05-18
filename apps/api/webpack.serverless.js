const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = {
  entry: './src/serverless.ts',
  target: 'node',
  mode: 'production',
  experiments: {
    asyncWebAssembly: true,
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: { configFile: 'tsconfig.build.json' },
        },
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    filename: 'serverless.js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs2',
  },
  externals: [
    nodeExternals({
      allowlist: [/^@aw-finanzas\//],
    }),
  ],
};
