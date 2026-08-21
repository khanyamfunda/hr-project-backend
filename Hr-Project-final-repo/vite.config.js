import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/Hr-Project-final-repo/' : '/',
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
