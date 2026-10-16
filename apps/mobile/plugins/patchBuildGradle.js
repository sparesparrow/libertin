'use strict';

// Pure helper, kept free of imports so it can be unit-tested without Expo.
// The Expo template signs release builds with the debug keystore. Play rejects
// that, and silently shipping it would be worse, so we patch the release build
// type to use an upload key read from the environment and fail loudly when the
// template no longer matches.

const MARKER = 'LIBERTIN_UPLOAD_STORE_FILE';

const RELEASE_SIGNING = `
        release {
            def uploadStoreFile = System.getenv('LIBERTIN_UPLOAD_STORE_FILE')
            if (uploadStoreFile) {
                storeFile file(uploadStoreFile)
                storePassword System.getenv('LIBERTIN_UPLOAD_STORE_PASSWORD')
                keyAlias System.getenv('LIBERTIN_UPLOAD_KEY_ALIAS')
                keyPassword System.getenv('LIBERTIN_UPLOAD_KEY_PASSWORD')
            }
        }`;

function patchBuildGradle(source) {
  if (source.includes(MARKER)) return source;

  const withSigningConfig = source.replace(
    /signingConfigs\s*\{/,
    (match) => match + RELEASE_SIGNING,
  );
  if (withSigningConfig === source) {
    throw new Error(
      'withReleaseSigning: no signingConfigs block found in app/build.gradle. The Expo template changed; update plugins/patchBuildGradle.js.',
    );
  }

  const patched = withSigningConfig.replace(
    /(buildTypes\s*\{[\s\S]*?\brelease\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release',
  );
  if (patched === withSigningConfig) {
    throw new Error(
      'withReleaseSigning: the release build type does not use the debug signing config. The Expo template changed; update plugins/patchBuildGradle.js.',
    );
  }

  return patched;
}

module.exports = { patchBuildGradle, MARKER };
