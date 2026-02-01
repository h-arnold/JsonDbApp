import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: __dirname,
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './setup/gas-mocks.setup.js',
    include: ['unit/**/*.test.js', 'helpers/**/*.test.js', 'validation/**/*.test.js'],
    clearMocks: true,
    cleanupMocks: true
  }
});
