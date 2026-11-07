// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { buildNews, fillMissingKo, leadSentences, parseFeed, unhtml } from './news'
import { fakeFetch, testEnv } from './testing'

const RSS = `<rss><channel><title>NHK</title>
<item><title>大雨で川があふれる</title><description><![CDATA[<p>8日は広い範囲で雨が降りました。夜まで続く見込みです。明日は晴れます。</p>]]></description><link>https://www3.nhk.or.jp/a1</link><pubDate>Fri, 06 Nov 2026 08:00:00 +0900</pubDate></item>
<item><title>見出しだけの記事</title><description></description><link>https://www3.nhk.or.jp/a0</link></item>
<item><title>新しい駅ができる</title><description>駅が&amp;できます。</description><link>https://www3.nhk.or.jp/a2</link></item>
</channel></rss>`

describe('/news 오늘의 뉴스', () => {
  test('RSS 를 읽고 HTML·글자 기호를 푼다', () => {
    const items = parseFeed(RSS)
    expect(items.map((i) => i.title)).toEqual(['大雨で川があふれる', '見出しだけの記事', '新しい駅ができる'])
    expect(items[2].desc).toBe('駅が&できます。')
    expect(unhtml('<p>a&nbsp;&ldquo;b&rdquo;</p>')).toBe('a “b”')
    // 가디언: 태그가 글자 기호로 한 번 더 감싸여 온다
    expect(unhtml('&lt;p&gt;One.&lt;/p&gt;&lt;p&gt;Two.&lt;/p&gt;')).toBe('One. Two.')
  })
  test('RSS 요약의 문장들(최대 6개, 너무 짧은 조각은 뺀다)', () => {
    expect(leadSentences('8日は広い範囲で雨が降りました。夜まで続く見込みです。明日は晴れます。')).toEqual(['8日は広い範囲で雨が降りました。', '夜まで続く見込みです。', '明日は晴れます。'])
    expect(leadSentences('The rain fell all day. It will stop soon. Ok.')).toEqual(['The rain fell all day.', 'It will stop soon.'])
    expect(leadSentences('Rain one. Rain two. Rain three. Rain four. Rain five. Rain six. Rain seven.')).toHaveLength(6)
  })
  test('분야별 피드는 그 태그로, 제목+첫 문장들을 줄로', async () => {
    const env = testEnv()
    const deps = { fetch: fakeFetch([['nhk', () => new Response(RSS)]]), now: () => 0 }
    const list = await buildNews(env, deps, 'ja')
    const a = list.find((x) => x.title === '大雨で川があふれる')!
    expect(a.source).toBe('NHK')
    expect(['world', 'society', 'economy', 'science', 'sports', 'culture']).toContain(a.tag)
    expect(a.lines.map((l) => l.src)).toEqual(['大雨で川があふれる', '8日は広い範囲で雨が降りました。', '夜まで続く見込みです。', '明日は晴れます。'])
    // 제목만 있는 기사는 들을 거리가 없어 뺀다
    expect(list.some((x) => x.title === '見出しだけの記事')).toBe(false)
    expect(a.link).toBe('https://www3.nhk.or.jp/a1')
  })
  test('빠진 한국어 뜻은 나중에 다시 채운다', async () => {
    const env = testEnv()
    const stored = { day: 'x', articles: [{ id: '1', title: 't', source: 's', link: '', date: '', tag: 'etc' as const, lines: [{ src: 'あ', ko: '아' }, { src: 'い' }] }] }
    await fillMissingKo(env, { fetch: fakeFetch([]), now: () => 5 }, 'ja', stored)
    expect(stored.koTry).toBe(5)
    expect(stored.articles[0].lines[0].ko).toBe('아')
  })
})
