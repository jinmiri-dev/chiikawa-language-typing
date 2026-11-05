/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { injectCsp } from './build/csp.ts'

/** 배포용 빌드에만 CSP meta를 넣는다(개발 서버는 HMR 때문에 제외). */
function cspPlugin(): Plugin {
  return {
    name: 'language-grade1-csp',
    apply: 'build',
    transformIndexHtml: (html) => injectCsp(html, { workerOrigin: process.env.VITE_WORKER_ORIGIN }),
  }
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 하위 경로: https://jinmiri-dev.github.io/chiikawa-language-typing/
  base: '/chiikawa-language-typing/',
  plugins: [react(), cspPlugin()],
  test: {
    environment: 'jsdom',
    // 로컬 .env 의 중계 서버 주소가 시험에 새어 들지 않게(시험은 필요할 때 stubEnv 로 넣는다)
    env: { VITE_WORKER_ORIGIN: '' },
  },
})
