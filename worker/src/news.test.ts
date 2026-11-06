// @vitest-environment node
import { describe, expect, test } from 'vitest'
import { buildNews, leadSentences, parseFeed, unhtml } from './news'
import { fakeFetch, testEnv } from './testing'

const RSS = `<rss><channel><title>NHK</title>
<item><title>大雨で川があふれる</title><description><![CDATA[<p>8日は広い範囲で雨が降りました。夜まで続く見込みです。明日は晴れます。</p>]]></description><link>https://www3.nhk.or.jp/a1</link><pubDate>Fri, 06 Nov 2026 08:00:00 +0900</pubDate></item>
<item><title>新しい駅ができる</title><description>駅が&amp;できます。</description><link>https://www3.nhk.or.jp/a2</link></item>
</channel></rss>`

describe('/news 오늘의 뉴스', () => {
  test('RSS 를 읽고 HTML·글자 기호를 푼다', () => {
    const items = parseFeed(RSS)
    expect(items.map((i) => i.title)).toEqual(['大雨で川があふれる', '新しい駅ができる'])
    expect(items[1].desc).toBe('駅が&できます。')
    expect(unhtml('<p>a&nbsp;&ldquo;b&rdquo;</p>')).toBe('a “b”')
  })
  test('첫 두 문장만(기사 전체는 쓰지 않는다)', () => {
    expect(leadSentences('8日は広い範囲で雨が降りました。夜まで続く見込みです。明日は晴れます。')).toEqual(['8日は広い範囲で雨が降りました。', '夜まで続く見込みです。'])
    expect(leadSentences('The rain fell all day. It will stop soon. Then sun.')).toEqual(['The rain fell all day.', 'It will stop soon.'])
  })
  test('분야별 피드는 그 태그로, 제목+첫 문장들을 줄로', async () => {
    const env = testEnv()
    const deps = { fetch: fakeFetch([['nhk.or.jp', () => new Response(RSS)]]), now: () => 0 }
    const list = await buildNews(env, deps, 'ja')
    const a = list.find((x) => x.title === '大雨で川があふれる')!
    expect(a.source).toBe('NHK')
    expect(['world', 'society', 'economy', 'science', 'sports', 'culture']).toContain(a.tag)
    expect(a.lines.map((l) => l.src)).toEqual(['大雨で川があふれる', '8日は広い範囲で雨が降りました。', '夜まで続く見込みです。'])
    expect(a.link).toBe('https://www3.nhk.or.jp/a1')
  })
})
