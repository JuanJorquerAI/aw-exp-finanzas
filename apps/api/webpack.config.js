module.exports = function (options) {
  const { externals } = options;
  return {
    ...options,
    externals: [
      function ({ request }, callback) {
        if (request && request.startsWith('@aw-finanzas/')) {
          return callback();
        }
        if (typeof externals === 'function') {
          return externals({ request }, callback);
        }
        callback();
      },
    ],
  };
};
