import type { ConfigContext, ExpoConfig } from 'expo/config';

// Android application id. It is permanent once the first build is uploaded to
// Google Play, so it is an owner decision. See docs/android-release.md.
export const DEFAULT_ANDROID_PACKAGE = 'cz.libertin.app';

const PACKAGE_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const VERSION_NAME_PATTERN = /^\d+\.\d+\.\d+$/;
const MAX_VERSION_CODE = 2_100_000_000;

type Env = Record<string, string | undefined>;

function read(env: Env, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

// Pure function so the release-critical fields can be unit-tested without Expo.
export function buildConfig(config: Partial<ExpoConfig>, env: Env): ExpoConfig {
  const androidPackage = read(env, 'ANDROID_PACKAGE') ?? DEFAULT_ANDROID_PACKAGE;
  if (!PACKAGE_PATTERN.test(androidPackage)) {
    throw new Error(`ANDROID_PACKAGE is not a valid application id: ${androidPackage}`);
  }

  const rawVersionCode = read(env, 'ANDROID_VERSION_CODE');
  const versionCode = rawVersionCode === undefined ? 1 : Number(rawVersionCode);
  if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > MAX_VERSION_CODE) {
    throw new Error(
      `ANDROID_VERSION_CODE must be an integer between 1 and ${MAX_VERSION_CODE}: ${rawVersionCode}`,
    );
  }

  const appVersion = read(env, 'APP_VERSION');
  if (appVersion !== undefined && !VERSION_NAME_PATTERN.test(appVersion)) {
    throw new Error(`APP_VERSION must look like 1.2.3: ${appVersion}`);
  }

  return {
    ...config,
    name: config.name ?? 'Libertin',
    slug: config.slug ?? 'libertin',
    version: appVersion ?? config.version ?? '1.0.0',
    plugins: [
      ...(config.plugins ?? []),
      './plugins/withReleaseSigning',
      './plugins/withKotlinVersion',
    ],
    android: {
      ...config.android,
      package: androidPackage,
      versionCode,
      // Discretion is a product requirement: no cloud backup of app data.
      allowBackup: false,
      // No contacts access until the contact-reach feature is an approved scope.
      blockedPermissions: [
        'android.permission.READ_CONTACTS',
        'android.permission.WRITE_CONTACTS',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
      ],
    },
  };
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const runtime = globalThis as { process?: { env?: Env } };
  return buildConfig(config, runtime.process?.env ?? {});
};
