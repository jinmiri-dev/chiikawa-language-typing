/**
 * GET /reading — 오늘의 읽을거리(위키백과, CC BY-SA 4.0). 뉴스보다 긴 글을 문장마다 듣고 읽는다.
 * 위키백과 "오늘의 알찬 글"(영어·일본어·중국어)과, 초보에게 알맞은 주제 목록에서 날마다 바뀌는 글.
 * "많이 본 글" 목록은 쓰지 않는다(아이에게 맞지 않는 글이 섞일 수 있어서).
 * 언어마다 그날 처음 부를 때 만들어 KV 에 둔다(예약 실행에 몰면 요청 한도 50개를 넘는다).
 */
import { aiTranslate } from './ai'
import { cachedJson, putJson, sha } from './cache'
import type { Deps, Env, Lang } from './env'
import { json } from './http'
import { cleanKo, fillMissingKo, KO_VERSION, leadSentences, type Article } from './news'
import { toScript } from './songs'

const UA = { 'user-agent': 'language-grade1 study site (+https://github.com/jinmiri-dev/chiikawa-language-typing)' }
const HOST: Record<Lang, string> = { en: 'en', ja: 'ja', zh: 'zh', tw: 'zh', mn: 'mn' }
const dayOf = (now: number) => new Date(now + 9 * 3600_000).toISOString().slice(0, 10)

/** 초보가 읽기 좋은 주제(영어 위키백과 제목). 날마다 3개씩 돌아가며 고른다 */
export const TOPICS = [
  'Tea', 'Coffee', 'Bread', 'Rice', 'Chocolate', 'Kimchi', 'Sushi', 'Noodle', 'Dumpling', 'Apple',
  'Cat', 'Dog', 'Giant panda', 'Penguin', 'Dolphin', 'Horse', 'Elephant', 'Rabbit', 'Owl', 'Butterfly',
  'Moon', 'Sun', 'Rainbow', 'Snow', 'Volcano', 'Earthquake', 'Pacific Ocean', 'Mount Everest', 'Gobi Desert', 'Forest',
  'Seoul', 'Tokyo', 'Beijing', 'Taipei', 'Ulaanbaatar', 'Mount Fuji', 'Great Wall of China', 'Jeju Island', 'Han River', 'Taiwan',
  'Music', 'Piano', 'Guitar', 'Football', 'Baseball', 'Olympic Games', 'Library', 'Bicycle', 'Train', 'Airplane',
  'Internet', 'Smartphone', 'Robot', 'Bee', 'Tree', 'Flower', 'Book', 'Hangul', 'Kanji', 'Cyrillic script',
  'Naadam', 'Morin khuur', 'Ger (yurt)', 'Genghis Khan', 'Lunar New Year', 'Chuseok', 'Mid-Autumn Festival', 'Christmas', 'Birthday', 'Family',
]

async function getJson<T>(deps: Deps, url: string): Promise<T | null> {
  try {
    const res = await deps.fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

/** 영어 제목 → 그 언어 위키백과 제목(없으면 null) */
async function titleIn(deps: Deps, lang: Lang, en: string): Promise<string | null> {
  if (lang === 'en') return en
  const j = await getJson<{ query?: { pages?: Record<string, { langlinks?: { '*': string }[] }> } }>(
    deps,
    `https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=${HOST[lang]}&redirects=1&format=json&titles=${encodeURIComponent(en)}`,
  )
  const page = Object.values(j?.query?.pages ?? {})[0]
  return page?.langlinks?.[0]?.['*'] ?? null
}

/** 그날의 알찬 글 제목(영어·일본어·중국어만 있다) */
async function featured(deps: Deps, lang: Lang, now: number): Promise<string | null> {
  if (lang === 'mn') return null
  const d = dayOf(now).replace(/-/g, '/')
  const j = await getJson<{ tfa?: { title?: string; titles?: { normalized?: string } } }>(deps, `https://api.wikimedia.org/feed/v1/wikipedia/${HOST[lang]}/featured/${d}`)
  return j?.tfa?.titles?.normalized ?? j?.tfa?.title?.replace(/_/g, ' ') ?? null
}

/** 글의 첫머리(요약 부분)를 문장으로 */
export function wikiSentences(text: string, max = 12): string[] {
  const clean = text
    .replace(/\s*[（(][^（）()]*[）)]/g, '') // 발음·외국어 표기 같은 괄호는 듣기에 방해돼 뺀다
    .replace(/\s*\[[^\]]*\]/g, '')
  return clean
    .split(/\n+/)
    .flatMap((p) => leadSentences(p.trim(), max))
    .slice(0, max)
}

async function extract(deps: Deps, lang: Lang, title: string): Promise<{ title: string; text: string; link: string } | null> {
  const j = await getJson<{ query?: { pages?: Record<string, { title?: string; extract?: string; fullurl?: string; missing?: string }> } }>(
    deps,
    `https://${HOST[lang]}.wikipedia.org/w/api.php?action=query&prop=extracts|info&inprop=url&explaintext=1&exintro=1&redirects=1&format=json&titles=${encodeURIComponent(title)}`,
  )
  const page = Object.values(j?.query?.pages ?? {})[0]
  if (!page?.extract || page.missing !== undefined) return null
  return { title: page.title ?? title, text: page.extract, link: page.fullurl ?? `https://${HOST[lang]}.wikipedia.org/wiki/${encodeURIComponent(title)}` }
}

export async function buildReading(env: Env, deps: Deps, lang: Lang): Promise<Article[]> {
  const now = deps.now()
  const day = Math.floor((now + 9 * 3600_000) / 86_400_000)
  // 몽골어 위키백과는 글이 적어 주제를 더 많이 본다
  const n = lang === 'mn' ? 7 : 3
  const topics = Array.from({ length: n }, (_, i) => TOPICS[(day * n + i) % TOPICS.length])
  const titles = [await featured(deps, lang, now), ...(await Promise.all(topics.map((t) => titleIn(deps, lang, t))))].filter((t, i, a): t is string => !!t && a.indexOf(t) === i)
  const picked: { title: string; lines: string[]; link: string }[] = []
  for (const t of titles) {
    const page = await extract(deps, lang, t)
    if (!page) continue
    const fix = (s: string) => (lang === 'zh' || lang === 'tw' ? toScript(lang, s) : s)
    const lines = wikiSentences(fix(page.text))
    // 세 문장도 안 되는 짧은 글(목록·동음이의 문서)은 뺀다
    if (lines.length < 3) continue
    picked.push({ title: fix(page.title), lines: [fix(page.title), ...lines], link: page.link })
  }
  const all = picked.flatMap((p) => p.lines)
  const ko = (await aiTranslate(env, deps, lang, 'ko', all)) ?? []
  let k = 0
  const out: Article[] = []
  for (const p of picked)
    out.push({
      id: `w${(await sha(p.link)).slice(0, 11)}`,
      title: p.title,
      source: '위키백과',
      link: p.link,
      date: dayOf(now),
      tag: 'reading',
      lines: p.lines.map((src) => {
        const t = ko[k++]
        return t ? { src, ko: t } : { src }
      }),
    })
  return out
}

const key = (lang: Lang) => `reading:v1:${lang}`
interface Stored {
  day: string
  articles: Article[]
  koTry?: number
  koV?: number
}

export async function reading(_url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  let stored = await cachedJson<Stored>(env.KV, key(lang))
  if (!stored || stored.day !== dayOf(deps.now())) {
    const lock = `readinglock:${lang}`
    if (!(await env.KV.get(lock))) {
      await env.KV.put(lock, '1', { expirationTtl: 120 })
      const fresh = await buildReading(env, deps, lang)
      if (fresh.length) {
        stored = { day: dayOf(deps.now()), articles: fresh, koV: KO_VERSION }
        await putJson(env.KV, key(lang), stored)
      }
    }
  } else if (stored.koV !== KO_VERSION || (stored.articles.some((a) => a.lines.some((l) => !l.ko)) && deps.now() - (stored.koTry ?? 0) > 3600_000)) {
    // AI 하루 한도로 뜻을 못 붙였으면 한 시간에 한 번 다시 채워 본다
    const lock = `readingko:${lang}`
    if (!(await env.KV.get(lock))) {
      await env.KV.put(lock, '1', { expirationTtl: 300 })
      if (cleanKo(lang, stored)) stored.koTry = 0
      await fillMissingKo(env, deps, lang, stored)
      await putJson(env.KV, key(lang), stored)
    }
  }
  return json({ lang, articles: stored?.articles ?? [] }, { headers: { 'cache-control': 'public, max-age=600' } })
}
