import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: 'dist/frontend',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/frontend/index.html'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
});
