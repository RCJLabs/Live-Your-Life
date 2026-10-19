import { defineConfig } from 'vitest/config';

// The engine's tests run in its own repo; these globs never reach engine/.
export default defineConfig({
  test: {
    include: ['packages/**/src/**/*.test.ts', 'apps/**/src/**/*.test.ts', 'tools/**/test/**/*.test.ts'],
    environment: 'node',
  },
});
