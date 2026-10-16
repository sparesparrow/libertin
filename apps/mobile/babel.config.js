module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // MSW 2.x pulls @mswjs/interceptors code that uses static class blocks.
    // Expo SDK 52's release bundler parses that dependency through Babel but
    // does not enable this transform by default, so standalone release bundles
    // fail unless the feature is transformed explicitly.
    plugins: ['@babel/plugin-transform-class-static-block'],
  };
};
