// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { tidyLyrics } from './lyrics'
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
  test('뜻은 우리 줄을 한 줄씩 번역해 1:1로 붙인다(유튜브 번역 자막은 줄이 밀려 쓰지 않는다)', async () => {
    const f = fakeFetch([['lang=ko', () => json(ko)], ['lang=zh-Hans', () => json(zh)], ['/youtube/v3/videos', embed]])
    const AI = { run: async (_m: string, input: unknown) => ({ response: JSON.stringify((JSON.parse((input as { messages: { content: string }[] }).messages[1].content) as string[]).map((_, i) => `意思${i + 1}`)) }) }
    const r = await handle(req('/lyrics?lang=zh&v=vvvvvvvvvvv'), testEnv({ AI }), { fetch: f, now })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      videoId: 'vvvvvvvvvvv', to: 'zh', source: 'manual', meaningSource: 'auto',
      lines: [
        { start: 2, end: 5, ko: '곰 세 마리가 한 집에 있어', meaning: '意思1' },
        { start: 5, end: 8, ko: '아빠곰 엄마곰 애기곰', meaning: '意思2' },
      ],
    })
    expect(f.calls.some((u) => u.includes('lang=zh-Hans'))).toBe(false)
  })
  test('채널 홍보 줄과 0.5초 안 되는 겹친 줄은 뺀다', () => {
    const c = (text: string, start: number, end: number) => ({ text, start, end })
    const out = tidyLyrics(
      [c('팝팝 프룻바스켓', 6, 8), c('안녕, 안녕!', 15, 18), c('안녕, 안녕!', 18.1, 18.3), c('정말 반가워', 19, 21), c('구독 좋아요', 93, 103)],
      '팝팝 프룻 바스켓 | Poppop Fruit Basket',
    )
    expect(out.map((l) => l.text)).toEqual(['안녕, 안녕!', '정말 반가워'])
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
