import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
      '/robots.txt': {
        target: 'http://127.0.0.1:3010',
      },
      '/sitemap.xml': {
        target: 'http://127.0.0.1:3010',
      },
    },
  },
});
