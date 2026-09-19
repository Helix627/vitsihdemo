import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/analyst': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/datasets': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/identity': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/vendor': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/graph': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/analyze': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/statistics': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/search': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/resolve': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/merge': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/cytoscape')) {
            return 'vendor-cytoscape';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/axios') || id.includes('node_modules/lucide-react')) {
            return 'vendor-utils';
          }
        },
      },
    },
  },
})
