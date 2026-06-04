import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
