import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/analyst': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/datasets': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/identity': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/vendor': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/graph': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/analyze': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/statistics': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/search': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/resolve': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/merge': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('node_modules/three-spritetext')) {
            return 'vendor-three';
          }
          if (id.includes('node_modules/react-force-graph') || id.includes('node_modules/react-force-graph-3d') || id.includes('node_modules/3d-force-graph') || id.includes('node_modules/d3-force-3d')) {
            return 'vendor-force-graph';
          }
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
