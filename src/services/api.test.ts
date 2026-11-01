import { afterEach, describe, expect, test, vi } from 'vitest'
import { ApiFailure, getTranscript, noticeFor, searchVideos, ttsUrl, workerOrigin } from './api'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('중계 함수 부르기', () => {
  test('주소가 없으면 연결 전', async () => {
    vi.stubEnv('VITE_WORKER_ORIGIN', '')
    expect(workerOrigin()).toBeNull()
    await expect(searchVideos('ja', { q: '歌' })).rejects.toMatchObject({ code: 'NOT_CONNECTED' })
  })
  test('검색 주소와 결과', async () => {
    vi.stubEnv('VITE_WORKER_ORIGIN', 'https://w.test')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ items: [] }), { headers: { 'content-type': 'application/json' } }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await searchVideos('tw', { tag: 'kids' })).toEqual({ items: [] })
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe('https://w.test/search?lang=tw&tag=kids')
  })
  test('오류 형식을 코드로', async () => {
    vi.stubEnv('VITE_WORKER_ORIGIN', 'https://w.test')
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { code: 'NO_TRACK', message: '없어요' } }), { status: 404 }))
    const e = await getTranscript('mn', 'vvvvvvvvvvv').catch((x) => x)
    expect(e).toBeInstanceOf(ApiFailure)
    expect(e.code).toBe('NO_TRACK')
  })
  test('망이 끊기면 OFFLINE', async () => {
    vi.stubEnv('VITE_WORKER_ORIGIN', 'https://w.test')
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch')
    })
    expect((await getTranscript('ja', 'vvvvvvvvvvv').catch((x) => x)).code).toBe('OFFLINE')
  })
  test('목소리 주소', () => {
    vi.stubEnv('VITE_WORKER_ORIGIN', 'https://w.test/')
    expect(ttsUrl('ja', 'male', 'はい', 0.75)).toBe('https://w.test/tts?lang=ja&voice=male&text=%E3%81%AF%E3%81%84&rate=0.75')
  })
})

describe('상태 안내 문구 (와이어프레임 10)', () => {
  test.each([
    ['QUOTA_EXCEEDED', '오늘 검색은 다 썼어요'],
    ['NO_TRACK', '자막이 없어요'],
    ['EMBED_BLOCKED', '재생할 수 없어요'],
    ['NOT_CONNECTED', '아직 준비 중이에요'],
    ['OFFLINE', '인터넷'],
    ['UPSTREAM_FAILED', '잠시'],
  ] as const)('%s', (code, text) => expect(noticeFor(new ApiFailure(code, ''), 'ja').title).toContain(text))
  test('남은 시간', () => expect(noticeFor(new ApiFailure('QUOTA_EXCEEDED', '', 5400), 'ja').body).toContain('1시간 30분 뒤'))
})
