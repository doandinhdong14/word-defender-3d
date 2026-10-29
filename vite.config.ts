import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/word-defender-3d/' : '/',
  plugins: [react()],
  build: {
    // Keep the deployable output in a real directory. The local `dist` path is
    // a OneDrive junction and cannot be packaged safely by the hosting workflow.
    outDir: 'build',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api/auth': 'http://127.0.0.1:3001',
      '/api/health': 'http://127.0.0.1:3001',
    },
    fs: {
      strict: false,
    },
  },
  resolve: {
    // Keep the project-facing paths for OneDrive-backed junctions. Otherwise
    // Vite treats src as external and serves raw TSX in dev mode.
    preserveSymlinks: true,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['src/tests/unit/**/*.test.ts'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
  },
} as any);
