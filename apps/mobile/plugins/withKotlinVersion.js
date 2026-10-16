'use strict';

const { withGradleProperties, withProjectBuildGradle } = require('expo/config-plugins');
const { setGradleProperty, pinKotlinGradlePlugin } = require('./patchKotlin');

// See patchKotlin.js for why this exists and when to remove it.
const KOTLIN_VERSION = '1.9.25';

module.exports = function withKotlinVersion(config) {
  const withProperty = withGradleProperties(config, (cfg) => {
    cfg.modResults = setGradleProperty(cfg.modResults, 'android.kotlinVersion', KOTLIN_VERSION);
    return cfg;
  });

  return withProjectBuildGradle(withProperty, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withKotlinVersion: only a Groovy android/build.gradle is supported.');
    }
    cfg.modResults.contents = pinKotlinGradlePlugin(cfg.modResults.contents, KOTLIN_VERSION);
    return cfg;
  });
};
