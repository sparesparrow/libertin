'use strict';

// Pure helpers, kept free of imports so they can be unit-tested without Expo.
//
// Expo SDK 52 ships expo-modules-core 2.2.x, which uses Compose Compiler 1.5.15.
// That compiler requires Kotlin 1.9.25, while the React Native 0.76 template
// defaults to 1.9.24 and the build fails in :expo-modules-core:compileDebugKotlin.
// expo-build-properties would set this, but adding it means changing the
// lockfile, so the same two edits are done here. Remove this once the Expo SDK
// is upgraded and no longer needs the pin.

function setGradleProperty(items, key, value) {
  const rest = items.filter((item) => !(item.type === 'property' && item.key === key));
  return [...rest, { type: 'property', key, value }];
}

const UNVERSIONED_KOTLIN_PLUGIN =
  /classpath\(\s*(['"])org\.jetbrains\.kotlin:kotlin-gradle-plugin\1\s*\)/;

// Pins an unversioned Kotlin Gradle plugin classpath entry. Sources that have
// no such entry (or already pin a version) are returned unchanged.
function pinKotlinGradlePlugin(source, version) {
  return source.replace(
    UNVERSIONED_KOTLIN_PLUGIN,
    (_match, quote) =>
      `classpath(${quote}org.jetbrains.kotlin:kotlin-gradle-plugin:${version}${quote})`,
  );
}

module.exports = { setGradleProperty, pinKotlinGradlePlugin };
