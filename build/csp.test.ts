import { expect, test } from 'vitest'
import { buildCsp, injectCsp } from './csp.ts'

const csp = buildCsp()
const directive = (name: string) => csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(name + ' '))

test('스크립트는 우리 사이트 것만 실행한다(인라인·eval 금지)', () => {
  expect(directive('script-src')).toBe("script-src 'self'")
})

test('플러그인·base 바꿔치기·폼 전송을 막는다', () => {
  expect(directive('object-src')).toBe("object-src 'none'")
  expect(directive('base-uri')).toBe("base-uri 'self'")
  expect(directive('form-action')).toBe("form-action 'none'")
})

test('글꼴은 Google Fonts만, 영상 틀은 유튜브 개인정보 보호 모드만 허용한다', () => {
  expect(directive('font-src')).toContain('https://fonts.gstatic.com')
  expect(directive('frame-src')).toBe('frame-src https://www.youtube-nocookie.com')
})

test('Worker 주소를 주면 connect-src에만 더한다', () => {
  const withWorker = buildCsp({ workerOrigin: 'https://language-grade1.example.workers.dev' })
  expect(withWorker).toContain("connect-src 'self' https://language-grade1.example.workers.dev")
  expect(withWorker).not.toContain("script-src 'self' https://language-grade1")
})

test('빌드 결과 html의 head 맨 앞에 meta로 넣는다', () => {
  const html = injectCsp('<html><head><meta charset="UTF-8" /></head></html>')
  expect(html).toMatch(/<head>\s*<meta http-equiv="Content-Security-Policy" content="default-src 'self';/)
})
