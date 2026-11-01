// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { ssml, VOICES } from './tts'
import { fakeFetch, json, testEnv } from './testing'

const req = (path: string) => new Request(`https://w.example${path}`, { headers: { origin: 'https://jinmiri-dev.github.io' } })
const now = () => Date.UTC(2026, 10, 2, 10)
const mp3 = () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } })

describe('/tts', () => {
  test('목소리 표: 다섯 언어 여자·남자', () => {
    expect(VOICES.mn).toEqual({ female: 'mn-MN-YesuiNeural', male: 'mn-MN-BataaNeural' })
    expect(VOICES.tw.female).toBe('zh-TW-HsiaoChenNeural')
  })
  test('SSML 은 글자를 이스케이프하고 0.75배는 느리게', () => {
    const x = ssml('ja', 'ja-JP-NanamiNeural', 'A<B & "C"', 0.75)
    expect(x).toContain('A&lt;B &amp; &quot;C&quot;')
    expect(x).toContain("rate='-25%'")
    expect(x).toContain("xml:lang='ja-JP'")
  })
  test('mp3 를 돌려주고 캐시한다(두 번째는 Azure 를 부르지 않음)', async () => {
    const env = testEnv()
    const f = fakeFetch([['tts.speech.microsoft.com', mp3]])
    const r = await handle(req('/tts?lang=ja&voice=male&text=' + encodeURIComponent('こんにちは')), env, { fetch: f, now })
    expect(r.headers.get('content-type')).toBe('audio/mpeg')
    expect(r.headers.get('cache-control')).toContain('immutable')
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
    await handle(req('/tts?lang=ja&voice=male&text=' + encodeURIComponent('こんにちは')), env, { fetch: f, now })
    expect(f.calls).toHaveLength(1)
    expect(f.calls[0]).toBe('https://koreacentral.tts.speech.microsoft.com/cognitiveservices/v1')
  })
  test('300자 넘거나 목소리가 틀리면 400', async () => {
    const f = fakeFetch([['tts', mp3]])
    expect((await handle(req('/tts?lang=ja&voice=female&text=' + 'あ'.repeat(301)), testEnv(), { fetch: f, now })).status).toBe(400)
    expect((await handle(req('/tts?lang=ja&voice=robot&text=a'), testEnv(), { fetch: f, now })).status).toBe(400)
  })
  test('하루 글자 상한', async () => {
    const env = testEnv()
    await env.KV.put('quota:tts:2026-11-02', '19999')
    const r = await handle(req('/tts?lang=en&voice=female&text=hello'), env, { fetch: fakeFetch([['tts', mp3]]), now })
    expect(r.status).toBe(429)
  })
})

describe('/netflix', () => {
  const tmdb = {
    results: [
      { id: 1, name: '상견니', original_name: '想見你', first_air_date: '2019-11-17', poster_path: '/p.jpg' },
      { id: 2, name: '어떤 작품', original_name: '某劇', first_air_date: '', poster_path: null },
    ],
  }
  test('TMDB 조건(넷플릭스·한국·대만 제작)과 응답 모양, 직접 고른 표시', async () => {
    const f = fakeFetch([['api.themoviedb.org', () => json(tmdb)]])
    const r = await handle(req('/netflix?lang=tw'), testEnv(), { fetch: f, now })
    const u = new URL(f.calls[0])
    expect(u.pathname).toBe('/3/discover/tv')
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ with_watch_providers: '8', watch_region: 'KR', with_original_language: 'zh', with_origin_country: 'TW', language: 'ko-KR' })
    expect(await r.json()).toEqual({
      region: 'KR',
      items: [
        { tmdbId: 1, type: 'tv', title: '상견니', originalTitle: '想見你', year: 2019, poster: 'https://image.tmdb.org/t/p/w185/p.jpg', pick: '대만 학교·일상 대화' },
        { tmdbId: 2, type: 'tv', title: '어떤 작품', originalTitle: '某劇', year: null, poster: null, pick: null },
      ],
      attribution: 'This product uses the TMDB API but is not endorsed or certified by TMDB.',
    })
  })
  test('하루 캐시', async () => {
    const env = testEnv()
    const f = fakeFetch([['api.themoviedb.org', () => json(tmdb)]])
    await handle(req('/netflix?lang=ja&type=movie'), env, { fetch: f, now })
    await handle(req('/netflix?lang=ja&type=movie'), env, { fetch: f, now })
    expect(f.calls).toHaveLength(1)
    expect(new URL(f.calls[0]).pathname).toBe('/3/discover/movie')
  })
})
