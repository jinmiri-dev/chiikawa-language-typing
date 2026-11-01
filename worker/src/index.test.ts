// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { fakeFetch, testEnv } from './testing'

const req = (path: string, origin = 'https://jinmiri-dev.github.io') => new Request(`https://w.example${path}`, { headers: { origin } })
const deps = (f = fakeFetch([])) => ({ fetch: f, now: () => Date.UTC(2026, 10, 2, 10) })

describe('공통', () => {
  test('/health', async () => {
    const r = await handle(req('/health'), testEnv(), deps())
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ ok: true })
  })
  test('허용 출처에만 CORS', async () => {
    expect((await handle(req('/health'), testEnv(), deps())).headers.get('access-control-allow-origin')).toBe('https://jinmiri-dev.github.io')
    expect((await handle(req('/health', 'https://evil.example'), testEnv(), deps())).headers.get('access-control-allow-origin')).toBeNull()
  })
  test('다른 출처에서 부르면 403', async () => {
    const r = await handle(req('/search?lang=ja&q=a', 'https://evil.example'), testEnv(), deps())
    expect(r.status).toBe(403)
  })
  test('모르는 경로는 404 와 오류 형식', async () => {
    const r = await handle(req('/nope'), testEnv(), deps())
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({ error: { code: 'NOT_FOUND', message: '없는 주소예요.' } })
  })
  test('잘못된 언어는 400', async () => {
    const r = await handle(req('/search?lang=xx&q=a'), testEnv(), deps())
    expect(r.status).toBe(400)
    expect((await r.json()).error.code).toBe('BAD_REQUEST')
  })
  test('POST 는 받지 않는다(OPTIONS 는 허용)', async () => {
    const post = new Request('https://w.example/health', { method: 'POST', headers: { origin: 'https://jinmiri-dev.github.io' } })
    expect((await handle(post, testEnv(), deps())).status).toBe(405)
    const opt = new Request('https://w.example/health', { method: 'OPTIONS', headers: { origin: 'https://jinmiri-dev.github.io' } })
    expect((await handle(opt, testEnv(), deps())).status).toBe(204)
  })
})

describe('하루 상한', async () => {
  const { useQuota } = await import('./quota')
  test('상한을 넘으면 429, 남은 시간과 사용량 헤더', async () => {
    const env = testEnv()
    const now = Date.UTC(2026, 10, 2, 10)
    for (let i = 0; i < 2; i++) expect((await useQuota(env.KV, 'search', 2, now)).ok).toBe(true)
    const r = await useQuota(env.KV, 'search', 2, now)
    expect(r.ok).toBe(false)
    expect(r.remaining).toBe(0)
    expect(r.resetSec).toBe(14 * 3600)
  })
  test('날이 바뀌면 다시', async () => {
    const env = testEnv()
    await useQuota(env.KV, 'search', 1, Date.UTC(2026, 10, 2, 10))
    expect((await useQuota(env.KV, 'search', 1, Date.UTC(2026, 10, 3, 1))).ok).toBe(true)
  })
})
