import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [path.resolve(__dirname, 'setup/gas-mocks.setup.js')],
    include: [
      path.resolve(__dirname, 'unit/**/*.test.js'),
      path.resolve(__dirname, 'helpers/**/*.test.js')
    ],
    clearMocks: true,
    cleanupMocks: true,
    coverage: {
      provider: 'v8',
      enabled: true,
      all: true,
      reportsDirectory: path.resolve(__dirname, 'coverage'),
      include: [path.resolve(__dirname, '../src/**/*.js')],
      exclude: [path.resolve(__dirname, '../src/appsscript.json')]
    }
  }
});
