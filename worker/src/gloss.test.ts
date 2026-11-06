// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { cleanPairs } from './gloss'
import { handle } from './index'
import { fakeFetch, testEnv } from './testing'

const post = (body: unknown) =>
  new Request('https://w.example/gloss?lang=ja', { method: 'POST', headers: { origin: 'https://jinmiri-dev.github.io', 'content-type': 'text/plain' }, body: JSON.stringify(body) })

describe('/gloss 낱말 짝', () => {
  test('원문에 없는 낱말·문장부호·긴 뜻은 버린다', () => {
    expect(cleanPairs([['話', '얘기'], ['何', '무슨'], ['?', '?'], ['ない', '없다'], ['話', '이야기'], ['何', '아주 아주 긴 설명이 붙은 뜻이라서 버려야 하는 것']], '何の話？')).toEqual([
      ['話', '얘기'],
      ['何', '무슨'],
    ])
  })
  test('AI 로 만들고 줄마다 저장해 다시 부르지 않는다', async () => {
    let calls = 0
    const AI = { run: async () => (calls++, { response: JSON.stringify([[['何', '무슨'], ['話', '얘기']]]) }) }
    const env = testEnv({ AI })
    const deps = { fetch: fakeFetch([]), now: () => 0, ip: '1.1.1.1' }
    const r = await handle(post({ lines: [{ src: '何の話？', ko: '무슨 얘기 중이야?' }] }), env, deps)
    expect(await r.json()).toEqual({ items: [[['何', '무슨'], ['話', '얘기']]] })
    await handle(post({ lines: [{ src: '何の話？', ko: '무슨 얘기 중이야?' }] }), env, deps)
    expect(calls).toBe(1)
  })
  test('다른 사이트에서는 못 부른다', async () => {
    const r = await handle(new Request('https://w.example/gloss?lang=ja', { method: 'POST', headers: { origin: 'https://evil.example' }, body: '{}' }), testEnv(), { fetch: fakeFetch([]), now: () => 0 })
    expect(r.status).toBe(403)
  })
})
