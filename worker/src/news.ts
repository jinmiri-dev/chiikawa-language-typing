/**
 * GET /news — 언어별 오늘의 뉴스(제목과 첫 한두 문장만, 원문 링크와 함께). 태그로 고를 수 있다.
 * 매일 아침(예약 실행)과, 그날 처음 부를 때 만든다. 한국어 뜻은 줄마다 1:1 번역. 기사 본문 전체는 가져오지 않는다.
 */
import { cachedJson, putJson, sha } from './cache'
import { aiTranslate } from './ai'
import { toScript } from './songs'
import type { Deps, Env, Lang } from './env'
import { json } from './http'

export const NEWS_TAGS = ['world', 'society', 'economy', 'science', 'health', 'sports', 'culture'] as const
export type NewsTag = (typeof NEWS_TAGS)[number]

interface Feed {
  url: string
  source: string
  /** 분야별 피드면 그 태그, 하나로 섞인 피드면 null(AI 로 나눈다) */
  tag: NewsTag | null
}

// NHK 는 2026년에 RSS 주소를 옮겼다(옛 www3 주소는 8월에 멈춤)
const NHK = (n: number, tag: NewsTag): Feed => ({ url: `https://news.web.nhk/n-data/conf/na/rss/cat${n}.xml`, source: 'NHK', tag })
const BBC = (path: string, tag: NewsTag): Feed => ({ url: `https://feeds.bbci.co.uk/${path}/rss.xml`, source: 'BBC News', tag })
const CNA = (name: string, tag: NewsTag): Feed => ({ url: `https://feeds.feedburner.com/rsscna/${name}`, source: '中央社', tag })
export const FEEDS: Record<Lang, Feed[]> = {
  ja: [NHK(6, 'world'), NHK(1, 'society'), NHK(5, 'economy'), NHK(3, 'science'), NHK(7, 'sports'), NHK(2, 'culture')],
  // VOA Learning English 는 2025년 3월에 멈춰서 BBC(분야별)와 가디언(요약이 길다)으로
  en: [
    BBC('news/world', 'world'),
    { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian', tag: 'world' },
    { url: 'https://www.theguardian.com/society/rss', source: 'The Guardian', tag: 'society' },
    BBC('news/business', 'economy'),
    BBC('news/technology', 'science'),
    BBC('news/science_and_environment', 'science'),
    BBC('news/health', 'health'),
    BBC('sport', 'sports'),
    BBC('news/entertainment_and_arts', 'culture'),
  ],
  zh: [
    { url: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', source: 'BBC 中文', tag: null },
    { url: 'https://news.un.org/feed/subscribe/zh/news/all/rss.xml', source: '联合国新闻', tag: 'world' },
  ],
  tw: [CNA('intworld', 'world'), CNA('social', 'society'), CNA('finance', 'economy'), CNA('technology', 'science'), CNA('lifehealth', 'health'), CNA('sport', 'sports'), CNA('culture', 'culture')],
  mn: [{ url: 'https://ikon.mn/rss', source: 'iKon.mn', tag: null }],
}

export interface NewsLine {
  src: string
  ko?: string
}
export interface Article {
  id: string
  title: string
  source: string
  link: string
  date: string
  tag: NewsTag | 'etc'
  lines: NewsLine[]
}

const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', hellip: '…', mdash: '—', ndash: '–' }
export const unhtml = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (m, e: string) =>
      e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENT[e.toLowerCase()] ?? m),
    )
    .replace(/<[^>]+>/g, ' ') // 가디언처럼 태그가 &lt;p&gt; 로 한 번 더 감싸여 온 경우
    .replace(/\s+/g, ' ')
    .trim()

const tagOf = (block: string, name: string) => block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] ?? ''

/** RSS·Atom 글 목록 */
export function parseFeed(xml: string): { title: string; desc: string; link: string; date: string }[] {
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) ?? []
  return items.map((b) => ({
    title: unhtml(tagOf(b, 'title')),
    desc: unhtml(tagOf(b, 'description') || tagOf(b, 'summary') || tagOf(b, 'content')),
    link: unhtml(tagOf(b, 'link')) || (b.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? ''),
    date: unhtml(tagOf(b, 'pubDate') || tagOf(b, 'updated') || tagOf(b, 'published')),
  }))
}

/** 언론사가 RSS 로 내준 요약의 문장들(기사 본문 전체는 가져오지 않는다. 전문은 원문 링크로) */
export function leadSentences(text: string, max = 6): string[] {
  const parts = text.split(/(?<=[。！？!?])|(?<=[.])\s+(?=[A-ZА-ЯӨҮ"“])/u).map((s) => s.trim()).filter(Boolean)
  // 듣기에도 너무 긴 문장은 뺀다
  return parts.filter((s) => s.length >= 6 && s.length <= 220).slice(0, max)
}

const UA = { 'user-agent': 'Mozilla/5.0 (language-grade1 study site; +https://github.com/jinmiri-dev/chiikawa-language-typing)' }
const dayOf = (now: number) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10)

/** 하나로 섞인 피드의 기사 분야를 AI 로 고른다(못 하면 etc) */
async function classify(env: Env, titles: string[]): Promise<(NewsTag | 'etc')[]> {
  if (!env.AI || !titles.length) return titles.map(() => 'etc')
  try {
    const r = (await env.AI.run('@cf/meta/llama-4-scout-17b-16e-instruct', {
      messages: [
        { role: 'system', content: `Classify each news headline into one of: ${NEWS_TAGS.join(', ')}. Reply with only a JSON array of ${titles.length} strings, same order.` },
        { role: 'user', content: JSON.stringify(titles) },
      ],
      max_tokens: 400,
      temperature: 0,
    })) as { response?: unknown }
    const text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response ?? '')
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] ?? '[]') as unknown[]
    return titles.map((_, i) => (NEWS_TAGS.includes(arr[i] as NewsTag) ? (arr[i] as NewsTag) : 'etc'))
  } catch {
    return titles.map(() => 'etc')
  }
}

export async function buildNews(env: Env, deps: Deps, lang: Lang): Promise<Article[]> {
  const feeds = FEEDS[lang]
  const picked: { feed: Feed; title: string; lines: string[]; link: string; date: string }[] = []
  for (const feed of feeds) {
    try {
      const res = await deps.fetch(feed.url, { headers: UA, signal: AbortSignal.timeout(8000) })
      if (!res.ok) continue
      for (const it of parseFeed(await res.text())) {
        if (picked.filter((p) => p.feed === feed).length >= (feed.tag ? 3 : 8)) break
        // BBC 중문 "간체" 피드도 번체로 올 때가 있어 간체로 맞춘다(대만 중앙사는 이미 번체라 그대로)
        const fix = (t: string) => (lang === 'zh' ? toScript('zh', t) : t)
        const title = fix(it.title.replace(/\s*[|｜-]\s*(NHK|BBC.*|中央社.*)$/i, '').trim())
        if (!title || title.length > 90 || picked.some((p) => p.title === title)) continue
        // 통신사 머리말 "（中央社記者…專電）" 은 뺀다
        const lead = leadSentences(fix(it.desc.replace(/^[（(][^）)]{2,40}[）)]\s*/, ''))).filter((s) => s !== title)
        // 제목만 있는 기사는 들을 거리가 없어 뺀다
        if (!lead.length) continue
        picked.push({ feed, title, lines: [title, ...lead], link: it.link, date: it.date })
      }
    } catch {
      /* 피드 하나가 안 되면 나머지로 */
    }
  }
  const all = picked.flatMap((p) => p.lines)
  const ko = (await aiTranslate(env, deps, lang, 'ko', all)) ?? []
  const needTag = picked.filter((p) => !p.feed.tag)
  const tags = await classify(env, needTag.map((p) => p.title))
  let k = 0
  const articles: Article[] = []
  for (const p of picked) {
    const lines: NewsLine[] = p.lines.map((src) => {
      const t = ko[k++]
      return t ? { src, ko: t } : { src }
    })
    articles.push({
      id: (await sha(p.link || p.title)).slice(0, 12),
      title: p.title,
      source: p.feed.source,
      link: p.link,
      date: p.date,
      tag: p.feed.tag ?? tags[needTag.indexOf(p)] ?? 'etc',
      lines,
    })
  }
  return articles
}

const key = (lang: Lang) => `news:v2:${lang}`
interface Stored {
  day: string
  articles: Article[]
  /** 빠진 한국어 뜻을 마지막으로 다시 번역해 본 때(AI 하루 한도에 걸렸을 때 다시 채운다) */
  koTry?: number
}

/** 한국어 뜻이 빠진 줄만 다시 번역해 채운다. 바뀐 게 있으면 true */
export async function fillMissingKo(env: Env, deps: Deps, lang: Lang, stored: Stored): Promise<boolean> {
  const missing = stored.articles.flatMap((a) => a.lines.filter((l) => !l.ko))
  if (!missing.length) return false
  stored.koTry = deps.now()
  const ko = (await aiTranslate(env, deps, lang, 'ko', missing.map((l) => l.src))) ?? []
  let changed = false
  missing.forEach((l, i) => {
    if (ko[i]) {
      l.ko = ko[i]
      changed = true
    }
  })
  return changed
}

/** 오늘 것을 만들고, 어제까지의 기사와 합쳐 최근 40개만 둔다 */
export async function refreshNews(env: Env, deps: Deps, lang: Lang): Promise<Stored> {
  const old = await cachedJson<Stored>(env.KV, key(lang))
  const fresh = await buildNews(env, deps, lang)
  const seen = new Set(fresh.map((a) => a.id))
  const body: Stored = { day: dayOf(deps.now()), articles: [...fresh, ...(old?.articles ?? []).filter((a) => !seen.has(a.id))].slice(0, 40) }
  if (fresh.length) await putJson(env.KV, key(lang), body)
  return body
}

export async function news(_url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  let stored = await cachedJson<Stored>(env.KV, key(lang))
  if (!stored || stored.day !== dayOf(deps.now())) {
    // 그날 처음이면 만든다(동시에 여럿이 만들지 않게 2분 잠금)
    const lock = `newslock:${lang}`
    if (!(await env.KV.get(lock))) {
      await env.KV.put(lock, '1', { expirationTtl: 120 })
      stored = await refreshNews(env, deps, lang)
    }
  } else if (stored.articles.some((a) => a.lines.some((l) => !l.ko)) && deps.now() - (stored.koTry ?? 0) > 3600_000) {
    // 아침에 AI 한도로 뜻을 못 붙였으면 한 시간에 한 번 다시 채워 본다
    const lock = `newsko:${lang}`
    if (!(await env.KV.get(lock))) {
      await env.KV.put(lock, '1', { expirationTtl: 300 })
      await fillMissingKo(env, deps, lang, stored)
      await putJson(env.KV, key(lang), stored)
    }
  }
  return json({ lang, tags: NEWS_TAGS, articles: stored?.articles ?? [] }, { headers: { 'cache-control': 'public, max-age=600' } })
}
