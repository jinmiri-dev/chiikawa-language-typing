// @vitest-environment node
import { expect, test } from 'vitest'
import { findSource, supadataTrack } from './transcript'
import { fakeFetch, testEnv } from './testing'

const SUPA = (lang: string, texts: string[]) =>
  new Response(JSON.stringify({ lang, availableLangs: [lang], content: texts.map((text, i) => ({ text, offset: i * 2000, duration: 1800, lang })) }))

test('Supadata: 그 언어 자막이면 초 단위 줄로, 다른 언어로 돌려주면 없는 것으로', async () => {
  const env = { ...testEnv(), SUPADATA_API_KEY: 'k' }
  const got = await supadataTrack(env, { now: () => 0, fetch: fakeFetch([['supadata', () => SUPA('mn', ['Сайн байна уу?', 'Би сайн.'])]]) }, 'abcdefghijk', 'mn')
  expect(got?.cues).toEqual([
    { start: 0, end: 1.8, text: 'Сайн байна уу?' },
    { start: 2, end: 3.8, text: 'Би сайн.' },
  ])
  expect(await supadataTrack(env, { now: () => 0, fetch: fakeFetch([['supadata', () => SUPA('en', ['Hello there.'])]]) }, 'abcdefghijk', 'mn')).toBeNull()
})

test('첫째 자막 서비스가 멈추면(무료 횟수 끝) Supadata 로 받는다', async () => {
  const env = { ...testEnv(), TRANSCRIPT_API_KEY: 'a', SUPADATA_API_KEY: 'k' }
  const deps = {
    now: () => 0,
    fetch: fakeFetch([
      ['searchapi', () => new Response('limit', { status: 429 })],
      ['supadata', () => SUPA('mn', ['Сайн байна уу?', 'Би сайн.'])],
    ]),
  }
  const r = await findSource(env, deps, 'abcdefghijk', 'mn', null)
  expect(r.via).toBe('captions')
  expect(r.src.cues).toHaveLength(2)
})
