import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id) return null;
          if (id.includes('node_modules')) {
            if (/react|react-dom|react-router-dom|@reduxjs\/toolkit|react-redux|axios/.test(id)) {
              return 'vendor';
            }
          }
          return null;
        }
      }
    }
  }
});