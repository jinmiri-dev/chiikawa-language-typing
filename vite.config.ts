/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 하위 경로: https://jinmiri-dev.github.io/chiikawa-language-typing/
  base: '/chiikawa-language-typing/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
})
