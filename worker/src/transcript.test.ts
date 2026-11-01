// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { mergeCues, pairKo, type Cue } from './transcript'
import { fakeFetch, json, testEnv } from './testing'

const req = (path: string) => new Request(`https://w.example${path}`, { headers: { origin: 'https://jinmiri-dev.github.io' } })
const now = () => Date.UTC(2026, 10, 2, 10)
const cue = (start: number, duration: number, text: string): Cue => ({ start, end: start + duration, text })

describe('자동 자막 줄 합치기', () => {
  test('짧은 조각을 2~12초 줄로, 문장부호에서 끊는다', () => {
    const lines = mergeCues([cue(0, 0.8, 'きょうは'), cue(0.8, 0.9, 'なにを'), cue(1.7, 1.0, 'たべる？'), cue(2.7, 1.2, 'ラーメン'), cue(3.9, 1.5, 'がいいな')])
    expect(lines.map((l) => l.text)).toEqual(['きょうはなにをたべる？', 'ラーメンがいいな'])
    expect([lines[0].start, lines[0].end]).toEqual([0, 2.7])
  })
  test('12초를 넘기지 않는다', () => {
    const lines = mergeCues(Array.from({ length: 10 }, (_, i) => cue(i * 2, 2, `w${i}`)), 'en')
    expect(lines.every((l) => l.end - l.start <= 12)).toBe(true)
  })
  test('조용한 틈(1.2초 넘게)에서 끊는다', () => expect(mergeCues([cue(0, 2.5, 'hello'), cue(4, 2.5, 'there')], 'en').map((l) => l.text)).toEqual(['hello', 'there']))
  test('영어는 낱말 사이를 띄운다', () => expect(mergeCues([cue(0, 1, 'how'), cue(1, 1, 'are'), cue(2, 1, 'you?')], 'en')[0].text).toBe('how are you?'))
})

describe('한국어 짝짓기', () => {
  test('시간이 겹치는 한국어 자막을 붙인다', () => {
    expect(pairKo([cue(0, 3, 'こんにちは'), cue(5, 2, 'またね')], [cue(0.2, 2.5, '안녕하세요'), cue(5.1, 1.5, '또 봐')]).map((l) => l.ko)).toEqual(['안녕하세요', '또 봐'])
  })
})

const tr = (lang: string) => `engine=youtube_transcripts&video_id=vvvvvvvvvvv&lang=${lang}`
const jaBody = { transcripts: [{ text: 'こんにちは。', start: 0, duration: 2.5 }, { text: 'またね。', start: 3, duration: 2 }] }
const koBody = { transcripts: [{ text: '안녕하세요.', start: 0, duration: 2.5 }, { text: '또 봐.', start: 3, duration: 2 }] }
const embed = (ok: boolean) => json({ items: [{ id: 'vvvvvvvvvvv', status: { embeddable: ok } }] })

describe('/transcript', () => {
  test('원문 + 한국어 자막', async () => {
    const f = fakeFetch([[tr('ja'), () => json(jaBody)], [tr('ko'), () => json(koBody)], ['/youtube/v3/videos', () => embed(true)]])
    const r = await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      videoId: 'vvvvvvvvvvv', lang: 'ja', source: 'manual', koSource: 'youtube',
      lines: [{ start: 0, end: 2.5, src: 'こんにちは。', ko: '안녕하세요.' }, { start: 3, end: 5, src: 'またね。', ko: '또 봐.' }],
    })
  })
  test('한국어 자막이 없으면 번역으로 채운다', async () => {
    const f = fakeFetch([
      [tr('ja'), () => json(jaBody)],
      [tr('ko'), () => json({ error: 'not available' }, 404)],
      ['/youtube/v3/videos', () => embed(true)],
      ['microsofttranslator', () => json([{ translations: [{ text: '안녕하세요.' }] }, { translations: [{ text: '또 봐요.' }] }])],
    ])
    const body = await (await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.koSource).toBe('auto')
    expect(body.lines.map((l: { ko: string }) => l.ko)).toEqual(['안녕하세요.', '또 봐요.'])
  })
  test('번역도 안 되면 뜻 없이', async () => {
    const f = fakeFetch([[tr('ja'), () => json(jaBody)], [tr('ko'), () => json({}, 404)], ['/youtube/v3/videos', () => embed(true)], ['microsofttranslator', () => json({}, 500)]])
    const body = await (await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.koSource).toBe('none')
    expect(body.lines[0].ko).toBeUndefined()
  })
  test('대만어는 zh-Hant 부터 찾는다', async () => {
    const f = fakeFetch([[tr('zh-Hant'), () => json({ transcripts: [{ text: '你好', start: 0, duration: 3 }] })], [tr('ko'), () => json({}, 404)], ['/youtube/v3/videos', () => embed(true)], ['microsofttranslator', () => json([{ translations: [{ text: '안녕' }] }])]])
    const body = await (await handle(req('/transcript?lang=tw&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.lines[0].src).toBe('你好')
    expect(f.calls.some((u) => u.includes('from=zh-Hant'))).toBe(true)
  })
  test('그 언어 자막이 없으면 404 NO_TRACK', async () => {
    const f = fakeFetch([['youtube_transcripts', () => json({ error: 'no transcript' }, 404)], ['/youtube/v3/videos', () => embed(true)]])
    const r = await handle(req('/transcript?lang=mn&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })
    expect(r.status).toBe(404)
    expect((await r.json()).error.code).toBe('NO_TRACK')
  })
  test('퍼가기 막힌 영상은 409', async () => {
    const f = fakeFetch([['/youtube/v3/videos', () => embed(false)]])
    expect((await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).status).toBe(409)
  })
  test('영상 id 형식이 틀리면 400', async () => expect((await handle(req('/transcript?lang=ja&v=bad'), testEnv(), { fetch: fakeFetch([]), now })).status).toBe(400))
  test('한 번 받은 영상은 캐시', async () => {
    const env = testEnv()
    const f = fakeFetch([[tr('ja'), () => json(jaBody)], [tr('ko'), () => json(koBody)], ['/youtube/v3/videos', () => embed(true)]])
    await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), env, { fetch: f, now })
    const n = f.calls.length
    await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), env, { fetch: f, now })
    expect(f.calls.length).toBe(n)
  })
})
