import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://career-tracker-hnp4.onrender.com',
        changeOrigin: true,
      },
    },
  },
})
