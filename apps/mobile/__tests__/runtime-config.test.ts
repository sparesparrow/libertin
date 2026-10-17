import { describe, expect, it, vi } from 'vitest';
import { MOCK_API_BASE_URL, readRuntimeConfig } from '../src/runtimeConfig';

describe('readRuntimeConfig', () => {
  it('defaults to explicit mock mode without requiring a live backend', () => {
    expect(readRuntimeConfig({})).toEqual({
      networkMode: 'mock',
      apiBaseUrl: MOCK_API_BASE_URL,
    });
  });

  it('requires an explicit base URL in live mode', () => {
    expect(() => readRuntimeConfig({ EXPO_PUBLIC_NETWORK_MODE: 'live' })).toThrow(
      /EXPO_PUBLIC_API_BASE_URL/,
    );
  });

  it('accepts an HTTPS live base URL and removes trailing slashes', () => {
    expect(
      readRuntimeConfig({
        EXPO_PUBLIC_NETWORK_MODE: 'live',
        EXPO_PUBLIC_API_BASE_URL: 'https://example.test/backend///',
      }),
    ).toEqual({
      networkMode: 'live',
      apiBaseUrl: 'https://example.test/backend',
    });
  });

  it.each([
    'http://example.test/api',
    'https://user:pass@example.test/api',
    'https://example.test/api?token=secret',
    'https://example.test/api#fragment',
    'not-a-url',
  ])('rejects unsafe live base URL %s', (value) => {
    expect(() =>
      readRuntimeConfig({
        EXPO_PUBLIC_NETWORK_MODE: 'live',
        EXPO_PUBLIC_API_BASE_URL: value,
      }),
    ).toThrow(/EXPO_PUBLIC_API_BASE_URL/);
  });

  it('rejects unknown network modes instead of silently falling back', () => {
    expect(() => readRuntimeConfig({ EXPO_PUBLIC_NETWORK_MODE: 'production' })).toThrow(
      /EXPO_PUBLIC_NETWORK_MODE/,
    );
  });

  it('defers invalid live build configuration until mounted startup validation', async () => {
    vi.stubEnv('EXPO_PUBLIC_NETWORK_MODE', 'live');
    vi.stubEnv('EXPO_PUBLIC_API_BASE_URL', '');
    vi.resetModules();

    try {
      const runtimeConfigModule = await import('../src/runtimeConfig');
      expect(() => runtimeConfigModule.readBuildRuntimeConfig()).toThrow(
        /EXPO_PUBLIC_API_BASE_URL/,
      );
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
