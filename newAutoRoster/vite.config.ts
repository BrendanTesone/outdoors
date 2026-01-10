import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    watch: {
      usePolling: true,
      interval: 100,
    },
    host: true, // often needed with Docker
  },
  build: {
    outDir: '../docs',
  },
})

