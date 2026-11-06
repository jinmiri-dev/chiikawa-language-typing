// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { mergeCues, pairKo, practiceLines, tidyKo, type Cue } from './transcript'
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

describe('연습할 줄 고르기', () => {
  test('그 언어 글자가 없는 줄([Music], 통째로 영어·로마자)은 건너뛰고 섞인 줄은 둔다', () => {
    const cues = [cue(0, 2, '[音楽]'), cue(2, 2, 'Baby 僕らまた'), cue(4, 2, 'Oh yeah yeah'), cue(6, 2, '♪ 歩き出す ♪')]
    expect(practiceLines(cues, 'ja').map((c) => c.text)).toEqual(['Baby 僕らまた', '歩き出す'])
  })
  test('그림 문자·음표와 줄 앞에 붙은 문장부호는 지운다(칠 수 없는 글자)', () => {
    expect(practiceLines([cue(0, 2, '。おはよう！ 平日の朝☀️'), cue(2, 2, '♪ Hello, it’s me ♪')], 'en').map((c) => c.text)).toEqual(['Hello, it’s me'])
    expect(practiceLines([cue(0, 2, '。おはよう！ 平日の朝☀️')], 'ja').map((c) => c.text)).toEqual(['おはよう！ 平日の朝'])
  })
  test('영어는 [Music] 같은 표시만 뺀다', () => {
    expect(practiceLines([cue(0, 2, '[Music]'), cue(2, 2, 'hello it’s me')], 'en').map((c) => c.text)).toEqual(['hello it’s me'])
  })
  test('몽골어는 키릴 글자가 있어야 한다', () => expect(practiceLines([cue(0, 2, 'Sain uu'), cue(2, 2, 'Сайн уу')], 'mn')).toHaveLength(1))
})

describe('번역 자막 다듬기', () => {
  test('문장 끝 뒤에 남은 조각은 다음 자막 앞으로 옮긴다(낱말이 갈리지 않게)', () => {
    const ko = tidyKo([cue(0, 3, '벌써 끊기는 것 같아요. 여'), cue(3, 3, '보세요, 들리세요?'), cue(6, 2, '저예요. 이렇게 오랜 시간이 지난'), cue(8, 3, '후에도')])
    expect(ko.map((k) => k.text)).toEqual(['벌써 끊기는 것 같아요.', '여보세요, 들리세요?', '저예요.', '이렇게 오랜 시간이 지난 후에도'])
  })
  test('[음악] 표시는 지우고, 표시 뒤 짧은 조각도 다음으로 넘긴다', () => {
    expect(tidyKo([cue(0, 2, '[음악]'), cue(2, 2, '[음악] 여'), cue(4, 2, '보세요, 저예요.')]).map((k) => k.text)).toEqual(['여보세요, 저예요.'])
  })
  test('끝까지 문장인 자막은 옮기지 않고, 음표는 지운다', () => {
    expect(tidyKo([cue(0, 2, '안녕하세요? 들리세요?'), cue(2, 2, '♪ 저예요 ☀️ ♪ ♪')]).map((k) => k.text)).toEqual(['안녕하세요? 들리세요?', '저예요'])
  })
  test('문장부호 없는 가사 번역은 그대로 둔다', () => {
    expect(tidyKo([cue(0, 2, '우리는 다시'), cue(2, 2, '서로의 길을 말야')]).map((k) => k.text)).toEqual(['우리는 다시', '서로의 길을 말야'])
  })
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
    expect(await r.json()).toMatchObject({
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
  test('직접 올린 자막을 먼저 달라고 한다', async () => {
    const f = fakeFetch([[tr('ja'), () => json(jaBody)], [tr('ko'), () => json(koBody)], ['/youtube/v3/videos', () => embed(true)]])
    await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })
    expect(new URL(f.calls.find((u) => u.includes('lang=ja'))!).searchParams.get('transcript_type')).toBe('manual')
  })
  test('자동 자막뿐이면 문장으로 합치고, 한국어도 자동 자막 기준으로 받는다', async () => {
    const auto = { available_languages: [{ name: 'English (auto-generated)', lang: 'en' }], transcripts: [{ text: 'hello there how', start: 0, duration: 1.5 }, { text: 'are you?', start: 1.5, duration: 1.5 }] }
    const f = fakeFetch([[tr('en'), () => json(auto)], [tr('ko'), () => json({ transcripts: [{ text: '안녕하세요, 어떻게 지내요?', start: 0, duration: 3 }] })], ['/youtube/v3/videos', () => embed(true)]])
    const body = await (await handle(req('/transcript?lang=en&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.source).toBe('asr')
    expect(body.lines.map((l: { src: string }) => l.src)).toEqual(['hello there how are you?'])
    expect(new URL(f.calls.find((u) => u.includes('lang=ko'))!).searchParams.get('transcript_type')).toBe('auto')
  })
  test('일본어 자막이 로마자뿐이면 같은 언어의 다른 자막을 이름으로 찾는다', async () => {
    const langs = [{ name: 'Japanese', lang: 'ja' }, { name: 'Japanese (auto-generated)', lang: 'ja' }]
    const f = fakeFetch([
      ['transcript_name=Japanese+%28auto-generated%29', () => json({ available_languages: langs, transcripts: [{ text: '僕らまた', start: 0, duration: 2.5 }] })],
      [tr('ja'), () => json({ available_languages: langs, transcripts: [{ text: 'Bokura mata', start: 0, duration: 2.5 }, { text: 'Sorezore no michi', start: 3, duration: 2.5 }] })],
      [tr('ko'), () => json({ transcripts: [{ text: '우리는 다시', start: 0, duration: 2.5 }] })],
      ['/youtube/v3/videos', () => embed(true)],
    ])
    const body = await (await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.lines.map((l: { src: string }) => l.src)).toEqual(['僕らまた'])
  })
  test('직접 올린 한국어가 없으면 자동 번역 한국어를 받는다', async () => {
    const f = fakeFetch([
      ['lang=ko&transcript_type=manual', () => json({ error: 'not available' }, 404)],
      ['lang=ko&transcript_type=auto', () => json(koBody)],
      [tr('ja'), () => json(jaBody)],
      ['/youtube/v3/videos', () => embed(true)],
    ])
    const body = await (await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.lines.map((l: { ko: string }) => l.ko)).toEqual(['안녕하세요.', '또 봐.'])
  })
  test('줄과 거의 안 맞는 한국어(소리를 잘못 알아들은 자막)는 버린다', async () => {
    const many = { transcripts: Array.from({ length: 10 }, (_, i) => ({ text: `行${i}。`, start: i * 3, duration: 2.5 })) }
    const f = fakeFetch([
      ['lang=ko', () => json({ transcripts: [{ text: '시가', start: 0, duration: 2 }] })],
      [tr('ja'), () => json(many)],
      ['/youtube/v3/videos', () => embed(true)],
      ['microsofttranslator', () => json({}, 500)],
    ])
    const body = await (await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })).json()
    expect(body.koSource).toBe('none')
    expect(body.lines.every((l: { ko?: string }) => !l.ko)).toBe(true)
  })
  test('끝내 로마자뿐이면 404 NO_TRACK 으로 알려 준다', async () => {
    const f = fakeFetch([[tr('ja'), () => json({ available_languages: [{ name: 'Japanese', lang: 'ja' }], transcripts: [{ text: 'Bokura mata', start: 0, duration: 2.5 }] })], ['/youtube/v3/videos', () => embed(true)]])
    const r = await handle(req('/transcript?lang=ja&v=vvvvvvvvvvv'), testEnv(), { fetch: f, now })
    expect(r.status).toBe(404)
    expect((await r.json()).error.message).toContain('로마자')
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
