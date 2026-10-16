'use strict';

const { withAppBuildGradle } = require('expo/config-plugins');
const { patchBuildGradle } = require('./patchBuildGradle');

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') {
      throw new Error('withReleaseSigning: only a Groovy app/build.gradle is supported.');
    }
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};
