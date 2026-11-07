// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { buildReading, TOPICS, wikiSentences } from './reading'
import { fakeFetch, testEnv } from './testing'

const EXTRACT = (title: string, text: string) =>
  new Response(JSON.stringify({ query: { pages: { '1': { title, extract: text, fullurl: `https://ja.wikipedia.org/wiki/${title}` } } } }))

describe('/reading 오늘의 읽을거리(위키백과)', () => {
  test('괄호(발음·외국어 표기)를 빼고 문장으로 나눈다', () => {
    expect(wikiSentences('Tea (/tiː/) is a drink. It is made from leaves.\nPeople drink it every day.')).toEqual(['Tea is a drink.', 'It is made from leaves.', 'People drink it every day.'])
    expect(wikiSentences('茶（ちゃ）は飲み物である。葉から作られる。毎日飲まれている。')).toEqual(['茶は飲み物である。', '葉から作られる。', '毎日飲まれている。'])
  })
  test('알찬 글 + 주제 글을 모으고, 세 문장 미만인 짧은 글은 뺀다', async () => {
    const env = testEnv()
    const deps = {
      now: () => 0,
      fetch: fakeFetch([
        ['api.wikimedia.org', () => new Response(JSON.stringify({ tfa: { titles: { normalized: '大雨' } } }))],
        ['prop=langlinks', () => new Response(JSON.stringify({ query: { pages: { '1': { langlinks: [{ '*': '茶' }] } } } }))],
        ['titles=%E5%A4%A7%E9%9B%A8', () => EXTRACT('大雨', '大雨は強い雨である。たくさん降ることが多い。川があふれることもある。')],
        ['titles=%E8%8C%B6', () => EXTRACT('茶', '茶は飲み物である。')],
      ]),
    }
    const list = await buildReading(env, deps, 'ja')
    expect(list.map((a) => [a.title, a.source, a.tag, a.lines.length])).toEqual([['大雨', '위키백과', 'reading', 4]])
    expect(TOPICS.length).toBeGreaterThanOrEqual(60)
  })
})
