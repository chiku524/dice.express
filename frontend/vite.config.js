import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Only proxy Canton ledger routes; /api/markets and other app routes stay on same origin
      // (use VITE_API_ORIGIN in .env to point to your deployed API when running frontend alone)
      '/api/command': {
        target: 'https://participant.dev.canton.wolfedgelabs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/api/query': {
        target: 'https://participant.dev.canton.wolfedgelabs.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    // Code splitting optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'utils': ['axios', 'zustand'],
        }
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
  }
})

