// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/alurlayanan/',     // ← ganti sesuai nama repo (HARUS ada slash awal & akhir)
})
