// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { fakeFetch, json, testEnv } from './testing'

const req = (path: string) => new Request(`https://w.example${path}`, { headers: { origin: 'https://jinmiri-dev.github.io' } })
const now = () => Date.UTC(2026, 10, 5, 10)
const embed = () => json({ items: [{ id: 'vvvvvvvvvvv', status: { embeddable: true } }] })
const ko = {
  available_languages: [{ name: 'Korean', lang: 'ko' }],
  transcripts: [
    { text: '[음악]', start: 0, duration: 2 },
    { text: '곰 세 마리가 한 집에 있어', start: 2, duration: 3 },
    { text: '아빠곰 엄마곰 애기곰', start: 5, duration: 3 },
  ],
}
const zh = { transcripts: [{ text: '三只熊住在一个家里', start: 2, duration: 3 }, { text: '熊爸爸 熊妈妈 熊宝宝', start: 5, duration: 3 }] }

describe('/lyrics (외국인 한국어 배우기)', () => {
  test('한국어 가사와 모국어 뜻을 줄마다 짝지어 준다', async () => {
    const f = fakeFetch([['lang=ko', () => json(ko)], ['lang=zh-Hans', () => json(zh)], ['/youtube/v3/videos', embed]])
    const r = await handle(req('/lyrics?lang=zh&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      videoId: 'vvvvvvvvvvv', to: 'zh', source: 'manual', meaningSource: 'youtube',
      lines: [
        { start: 2, end: 5, ko: '곰 세 마리가 한 집에 있어', meaning: '三只熊住在一个家里' },
        { start: 5, end: 8, ko: '아빠곰 엄마곰 애기곰', meaning: '熊爸爸 熊妈妈 熊宝宝' },
      ],
    })
  })
  test('몽골어 학습자는 mn 자막을 뜻으로', async () => {
    const f = fakeFetch([['lang=ko', () => json(ko)], ['lang=mn', () => json({ transcripts: [{ text: 'Гурван баавгай', start: 2, duration: 3 }] })], ['/youtube/v3/videos', embed]])
    const body = await (await handle(req('/lyrics?lang=mn&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.lines[0].meaning).toBe('Гурван баавгай')
  })
  test('뜻이 없으면 가사만', async () => {
    const f = fakeFetch([['lang=ko', () => json(ko)], ['lang=en', () => json({}, 404)], ['/youtube/v3/videos', embed]])
    const body = await (await handle(req('/lyrics?lang=en&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.meaningSource).toBe('none')
    expect(body.lines[0].meaning).toBeUndefined()
  })
  test('한국어 자막이 없으면 404 NO_TRACK', async () => {
    const f = fakeFetch([['youtube_transcripts', () => json({ error: 'none' }, 404)], ['/youtube/v3/videos', embed]])
    const r = await handle(req('/lyrics?lang=zh&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })
    expect(r.status).toBe(404)
    expect((await r.json()).error.code).toBe('NO_TRACK')
  })
  test('한국어 자막은 영상마다 한 번만 받는다(다른 모국어는 뜻만 더 받는다)', async () => {
    const env = testEnv()
    const f = fakeFetch([['lang=ko', () => json(ko)], ['lang=zh-Hans', () => json(zh)], ['lang=mn', () => json({}, 404)], ['/youtube/v3/videos', embed]])
    await handle(req('/lyrics?lang=zh&v=vvvvvvvvvvv'), env, { fetch: f, now })
    await handle(req('/lyrics?lang=mn&v=vvvvvvvvvvv'), env, { fetch: f, now })
    expect(f.calls.filter((u) => u.includes('lang=ko'))).toHaveLength(1)
  })
  test('한 번 받은 영상은 오래 저장해 자막 서비스를 다시 부르지 않는다', async () => {
    const env = testEnv()
    const f = fakeFetch([['lang=ko', () => json(ko)], ['lang=zh-Hans', () => json(zh)], ['/youtube/v3/videos', embed]])
    await handle(req('/lyrics?lang=zh&v=vvvvvvvvvvv'), env, { fetch: f, now })
    const n = f.calls.length
    const again = await handle(req('/lyrics?lang=zh&v=vvvvvvvvvvv'), env, { fetch: f, now: () => now() + 200 * 86_400_000 })
    expect(again.headers.get('x-cache')).toBe('hit')
    expect(f.calls.length).toBe(n)
  })
})
