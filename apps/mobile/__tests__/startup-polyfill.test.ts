import { describe, expect, it, vi } from 'vitest';

describe('native startup polyfills', () => {
  it('installs Web Streams and missing Hermes event globals before MSW loads', async () => {
    const globalNames = [
      'TransformStream',
      'Event',
      'EventTarget',
      'MessageEvent',
      'BroadcastChannel',
      'Document',
      'XMLHttpRequestUpload',
    ] as const;
    const originalGlobals = new Map(
      globalNames.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]),
    );
    const registerRootComponent = vi.fn();

    try {
      for (const name of globalNames) {
        Object.defineProperty(globalThis, name, {
          configurable: true,
          writable: true,
          value: undefined,
        });
      }
      vi.resetModules();
      vi.doMock('expo', () => ({ registerRootComponent }));
      vi.doMock('../src/App', async () => {
        for (const name of globalNames) {
          expect((globalThis as unknown as Record<string, unknown>)[name]).toBeTypeOf('function');
        }
        const { server } = await import('../src/mocks/native');
        server.close();
        return { default: () => null };
      });

      await import('../index.js');

      expect(registerRootComponent).toHaveBeenCalledOnce();
    } finally {
      vi.doUnmock('expo');
      vi.doUnmock('../src/App');
      vi.resetModules();
      for (const name of globalNames) {
        const descriptor = originalGlobals.get(name);
        if (descriptor) {
          Object.defineProperty(globalThis, name, descriptor);
        } else {
          Reflect.deleteProperty(globalThis, name);
        }
      }
    }
  });
});
