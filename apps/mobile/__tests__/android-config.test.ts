import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { buildConfig, DEFAULT_ANDROID_PACKAGE } from '../app.config';

const require = createRequire(import.meta.url);
const { patchBuildGradle } = require('../plugins/patchBuildGradle.js') as {
  patchBuildGradle: (source: string) => string;
};

type PropertyItem = { type: string; key?: string; value?: string };
const { setGradleProperty, pinKotlinGradlePlugin } = require('../plugins/patchKotlin.js') as {
  setGradleProperty: (items: PropertyItem[], key: string, value: string) => PropertyItem[];
  pinKotlinGradlePlugin: (source: string, version: string) => string;
};

const base = { name: 'Libertin', slug: 'libertin', version: '1.0.0' };

describe('buildConfig', () => {
  it('uses safe defaults without CI variables', () => {
    const config = buildConfig(base, {});
    expect(config.android?.package).toBe(DEFAULT_ANDROID_PACKAGE);
    expect(config.android?.versionCode).toBe(1);
    expect(config.version).toBe('1.0.0');
  });

  it('takes package, version code and version name from the environment', () => {
    const config = buildConfig(base, {
      ANDROID_PACKAGE: 'cz.example.app',
      ANDROID_VERSION_CODE: '42',
      APP_VERSION: '1.2.3',
    });
    expect(config.android?.package).toBe('cz.example.app');
    expect(config.android?.versionCode).toBe(42);
    expect(config.version).toBe('1.2.3');
  });

  it('treats empty variables as unset', () => {
    const config = buildConfig(base, { ANDROID_PACKAGE: '', APP_VERSION: ' ' });
    expect(config.android?.package).toBe(DEFAULT_ANDROID_PACKAGE);
    expect(config.version).toBe('1.0.0');
  });

  it.each(['0', '-3', '1.5', 'abc', '2100000001'])('rejects version code %s', (value) => {
    expect(() => buildConfig(base, { ANDROID_VERSION_CODE: value })).toThrow(/ANDROID_VERSION_CODE/);
  });

  it.each(['Cz.Bad', 'nodots', '1abc.app'])('rejects application id %s', (value) => {
    expect(() => buildConfig(base, { ANDROID_PACKAGE: value })).toThrow(/ANDROID_PACKAGE/);
  });

  it('rejects a malformed version name', () => {
    expect(() => buildConfig(base, { APP_VERSION: 'v1.2' })).toThrow(/APP_VERSION/);
  });

  it('disables backup and blocks contacts access', () => {
    const config = buildConfig(base, {});
    expect(config.android?.allowBackup).toBe(false);
    expect(config.android?.blockedPermissions).toEqual(
      expect.arrayContaining([
        'android.permission.READ_CONTACTS',
        'android.permission.WRITE_CONTACTS',
      ]),
    );
  });

  it('registers the native build plugins, keeping existing plugins', () => {
    const config = buildConfig({ ...base, plugins: ['expo-status-bar'] }, {});
    expect(config.plugins).toEqual([
      'expo-status-bar',
      './plugins/withReleaseSigning',
      './plugins/withKotlinVersion',
    ]);
  });
});

const TEMPLATE = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            minifyEnabled true
        }
    }
}
`;

describe('patchBuildGradle', () => {
  it('moves the release build type off the debug keystore', () => {
    const patched = patchBuildGradle(TEMPLATE);
    expect(patched).toContain('LIBERTIN_UPLOAD_STORE_FILE');
    expect(patched.match(/signingConfig signingConfigs\.debug/g)).toHaveLength(1);
    expect(patched.slice(patched.indexOf('buildTypes'))).toContain(
      'signingConfig signingConfigs.release',
    );
  });

  it('keeps the debug build type on the debug keystore', () => {
    const patched = patchBuildGradle(TEMPLATE);
    const buildTypes = patched.slice(patched.indexOf('buildTypes'));
    expect(buildTypes.slice(0, buildTypes.indexOf('release'))).toContain(
      'signingConfig signingConfigs.debug',
    );
  });

  it('is idempotent', () => {
    const once = patchBuildGradle(TEMPLATE);
    expect(patchBuildGradle(once)).toBe(once);
  });

  it('fails loudly when the template has no signingConfigs block', () => {
    expect(() => patchBuildGradle('android {}')).toThrow(/signingConfigs block/);
  });

  it('fails loudly when the release build type no longer uses the debug key', () => {
    const changed = 'android { signingConfigs { debug {} } buildTypes { release { minifyEnabled true } } }';
    expect(() => patchBuildGradle(changed)).toThrow(/release build type/);
  });
});

describe('setGradleProperty', () => {
  it('adds a missing property and keeps the others', () => {
    const items = [
      { type: 'comment', value: 'Project-wide settings' },
      { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx2048m' },
    ];
    const result = setGradleProperty(items, 'android.kotlinVersion', '1.9.25');
    expect(result).toEqual([
      ...items,
      { type: 'property', key: 'android.kotlinVersion', value: '1.9.25' },
    ]);
  });

  it('replaces an existing value without duplicating the key', () => {
    const items = [{ type: 'property', key: 'android.kotlinVersion', value: '1.9.24' }];
    const result = setGradleProperty(items, 'android.kotlinVersion', '1.9.25');
    expect(result).toEqual([{ type: 'property', key: 'android.kotlinVersion', value: '1.9.25' }]);
  });

  it('does not mutate its input', () => {
    const items = [{ type: 'property', key: 'a', value: '1' }];
    setGradleProperty(items, 'b', '2');
    expect(items).toHaveLength(1);
  });
});

describe('pinKotlinGradlePlugin', () => {
  it('pins an unversioned Kotlin Gradle plugin classpath entry', () => {
    const source = "dependencies {\n    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')\n}";
    expect(pinKotlinGradlePlugin(source, '1.9.25')).toBe(
      "dependencies {\n    classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.25')\n}",
    );
  });

  it('leaves an already versioned entry alone', () => {
    const source = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24')";
    expect(pinKotlinGradlePlugin(source, '1.9.25')).toBe(source);
  });

  it('leaves sources without the entry alone', () => {
    const source = 'dependencies { }';
    expect(pinKotlinGradlePlugin(source, '1.9.25')).toBe(source);
  });
});
