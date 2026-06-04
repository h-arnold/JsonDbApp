import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup/gas-mocks.setup.js'],
    include: ['tests/unit/**/*.test.js', 'tests/helpers/**/*.test.js'],
    clearMocks: true,
    cleanupMocks: true,
    coverage: {
      provider: 'v8',
      all: true,
      reportsDirectory: 'tests/coverage/',
      include: ['src/**/*.js'],
      exclude: ['src/appsscript.json']
    }
  }
});
