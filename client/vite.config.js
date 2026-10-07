import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seoFilesPlugin } from './vite.seo.js';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), seoFilesPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        stats: resolve(root, 'stats.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:3010',
        ws: true,
      },
      '/api': {
        target: 'http://127.0.0.1:3010',
      },
    },
  },
});
