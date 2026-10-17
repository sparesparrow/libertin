export const MOCK_API_BASE_URL = 'https://api.libertin.cz/v1';

export type NetworkMode = 'mock' | 'live';

export interface RuntimeConfig {
  readonly networkMode: NetworkMode;
  readonly apiBaseUrl: string;
}

type RuntimeEnv = {
  readonly EXPO_PUBLIC_NETWORK_MODE?: string | undefined;
  readonly EXPO_PUBLIC_API_BASE_URL?: string | undefined;
};

function liveBaseUrl(raw: string | undefined): string {
  const value = raw?.trim();
  if (!value) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required when EXPO_PUBLIC_NETWORK_MODE=live');
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid HTTPS URL');
  }

  if (
    url.protocol !== 'https:' ||
    url.username !== '' ||
    url.password !== '' ||
    url.search !== '' ||
    url.hash !== ''
  ) {
    throw new Error(
      'EXPO_PUBLIC_API_BASE_URL must be HTTPS and must not contain credentials, a query, or a fragment',
    );
  }

  return url.toString().replace(/\/+$/, '');
}

export function readRuntimeConfig(env: RuntimeEnv): RuntimeConfig {
  const rawMode = env.EXPO_PUBLIC_NETWORK_MODE?.trim();
  const networkMode = rawMode === undefined || rawMode === '' ? 'mock' : rawMode;

  if (networkMode === 'mock') {
    // This URL is only the namespace intercepted by MSW. It is not evidence that
    // api.libertin.cz exists or implements the frozen contract.
    return { networkMode, apiBaseUrl: MOCK_API_BASE_URL };
  }

  if (networkMode !== 'live') {
    throw new Error('EXPO_PUBLIC_NETWORK_MODE must be either mock or live');
  }

  return { networkMode, apiBaseUrl: liveBaseUrl(env.EXPO_PUBLIC_API_BASE_URL) };
}

// Expo only inlines EXPO_PUBLIC_* values when they are accessed with direct
// dot notation. Keep this object explicit; never place credentials or tokens in
// EXPO_PUBLIC_* variables because they become part of the application bundle.
declare const process: { env: RuntimeEnv };

// Resolve build configuration from the mounted app's startup effect instead of
// during module evaluation. Invalid live configuration can then render the
// startup error screen rather than preventing AppRegistry registration.
export function readBuildRuntimeConfig(): RuntimeConfig {
  return readRuntimeConfig({
    EXPO_PUBLIC_NETWORK_MODE: process.env.EXPO_PUBLIC_NETWORK_MODE,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  });
}
