import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
    css: true,
    // Exclude Playwright E2E tests — they run via `npm run test:e2e`, not vitest
    exclude: ['**/node_modules/**', '**/tests/e2e/**', '**/*.spec.js'],
  },
});
