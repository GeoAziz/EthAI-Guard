import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
  // exclude e2e Playwright specs and node_modules tests from the unit test runner
  exclude: ['e2e/**', 'node_modules/**'],
  },
});
