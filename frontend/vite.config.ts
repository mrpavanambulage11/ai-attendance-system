import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:8000', changeOrigin: true },
      '/employees': { target: 'http://localhost:8000', changeOrigin: true },
      '/attendance': { target: 'http://localhost:8000', changeOrigin: true, ws: true },
    },
  },
})
