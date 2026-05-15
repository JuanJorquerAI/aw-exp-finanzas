process.chdir(__dirname);
const webpack = require('webpack');
const config = require('./webpack.serverless.js');

webpack(config, (err, stats) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (stats.hasErrors()) {
    console.error(stats.toString({ errors: true }));
    process.exit(1);
  }
  console.log('serverless bundle OK');
});
