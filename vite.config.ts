import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/proxy/github': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/github/, ''),
      },
      '/proxy/circleci': {
        target: 'https://circleci.com/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/circleci/, ''),
      },
    },
  },
})
