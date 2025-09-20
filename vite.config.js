// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/alurlayanan/',   // ← WAJIB untuk GitHub Pages repo ini
})
