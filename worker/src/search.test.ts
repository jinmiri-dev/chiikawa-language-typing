// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { handle } from './index'
import { isoDuration, TAG_QUERY } from './search'
import { fakeFetch, json, testEnv } from './testing'

const req = (path: string) => new Request(`https://w.example${path}`, { headers: { origin: 'https://jinmiri-dev.github.io' } })
const now = () => Date.UTC(2026, 10, 2, 10)

const searchBody = {
  nextPageToken: 'NEXT',
  items: [
    { id: { videoId: 'aaaaaaaaaaa' }, snippet: { title: 'It&#39;s a song &amp; more', channelTitle: 'Ch', thumbnails: { medium: { url: 'https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg' } } } },
    { id: { videoId: 'bbbbbbbbbbb' }, snippet: { title: 'B', channelTitle: 'Ch2', thumbnails: {} } },
  ],
}
const videosBody = {
  items: [
    { id: 'aaaaaaaaaaa', contentDetails: { duration: 'PT4M12S' }, status: { embeddable: true } },
    { id: 'bbbbbbbbbbb', contentDetails: { duration: 'PT1H2S' }, status: { embeddable: false } },
  ],
}
const yt = () => fakeFetch([['/youtube/v3/search', () => json(searchBody)], ['/youtube/v3/videos', () => json(videosBody)]])

describe('/search', () => {
  test('응답 모양: 제목 글자 풀기, 길이, 썸네일, 임베드', async () => {
    const f = yt()
    const r = await handle(req('/search?lang=ja&q=ニュース'), testEnv(), { fetch: f, now })
    expect(r.status).toBe(200)
    expect(r.headers.get('x-quota-remaining')).toBe('89')
    expect(await r.json()).toEqual({
      items: [
        { videoId: 'aaaaaaaaaaa', title: "It's a song & more", channel: 'Ch', durationSec: 252, thumbnail: 'https://i.ytimg.com/vi/aaaaaaaaaaa/mqdefault.jpg', embeddable: true },
        { videoId: 'bbbbbbbbbbb', title: 'B', channel: 'Ch2', durationSec: 3602, thumbnail: 'https://i.ytimg.com/vi/bbbbbbbbbbb/mqdefault.jpg', embeddable: false },
      ],
      nextPageToken: 'NEXT',
    })
    const s = new URL(f.calls[0])
    expect(s.searchParams.get('videoCaption')).toBe('closedCaption')
    expect(s.searchParams.get('videoEmbeddable')).toBe('true')
    expect(s.searchParams.get('relevanceLanguage')).toBe('ja')
    expect(s.searchParams.get('key')).toBe('yt')
  })
  test('태그만 주면 그 언어 검색어로', async () => {
    const f = yt()
    await handle(req('/search?lang=tw&tag=kids'), testEnv(), { fetch: f, now })
    expect(new URL(f.calls[0]).searchParams.get('q')).toBe(TAG_QUERY.tw.kids)
    expect(new URL(f.calls[0]).searchParams.get('regionCode')).toBe('TW')
  })
  test('같은 검색은 캐시에서, 상한을 쓰지 않는다', async () => {
    const env = testEnv()
    const f = yt()
    await handle(req('/search?lang=ja&q=歌'), env, { fetch: f, now })
    const r = await handle(req('/search?lang=ja&q=歌'), env, { fetch: f, now })
    expect(f.calls.filter((u) => u.includes('/search'))).toHaveLength(1)
    expect(r.status).toBe(200)
    expect(await env.KV.get('quota:search:2026-11-02')).toBe('1')
  })
  test('검색어도 태그도 없으면 400', async () => expect((await handle(req('/search?lang=ja'), testEnv(), { fetch: yt(), now })).status).toBe(400))
  test('키가 없으면 503', async () => {
    const r = await handle(req('/search?lang=ja&q=a'), testEnv({ YOUTUBE_API_KEY: undefined }), { fetch: yt(), now })
    expect(r.status).toBe(503)
    expect((await r.json()).error.code).toBe('NOT_CONFIGURED')
  })
  test('유튜브가 실패하면 502', async () => {
    const r = await handle(req('/search?lang=ja&q=a'), testEnv(), { fetch: fakeFetch([['/youtube', () => json({}, 403)]]), now })
    expect(r.status).toBe(502)
  })
  test('ISO 8601 길이', () => {
    expect(isoDuration('PT4M12S')).toBe(252)
    expect(isoDuration('PT1H')).toBe(3600)
    expect(isoDuration('P0D')).toBe(0)
  })
})
