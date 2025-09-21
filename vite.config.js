import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/alurlayanan/',   // nama repo project pages kamu
  build: { outDir: 'docs' } // supaya hasil build ke /docs
})
