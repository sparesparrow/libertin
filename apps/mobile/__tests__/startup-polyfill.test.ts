import { describe, expect, it, vi } from 'vitest';

describe('native startup polyfills', () => {
  it('installs Web Streams before evaluating the MSW native interceptor', async () => {
    const originalTransformStream = Object.getOwnPropertyDescriptor(globalThis, 'TransformStream');
    const registerRootComponent = vi.fn();

    try {
      Object.defineProperty(globalThis, 'TransformStream', {
        configurable: true,
        writable: true,
        value: undefined,
      });
      vi.resetModules();
      vi.doMock('expo', () => ({ registerRootComponent }));
      vi.doMock('../src/App', async () => {
        expect(globalThis.TransformStream).toBeTypeOf('function');
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
      if (originalTransformStream) {
        Object.defineProperty(globalThis, 'TransformStream', originalTransformStream);
      } else {
        Reflect.deleteProperty(globalThis, 'TransformStream');
      }
    }
  });
});
