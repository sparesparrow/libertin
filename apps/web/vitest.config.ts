import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'web',
    // The middleware is request-in / response-out with no DOM involvement, so
    // it runs under plain node. Component-level tests live in packages/ui.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
});
