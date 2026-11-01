/** GET /netflix — 언어별 넷플릭스 작품 (기획안 7.5, 아키텍처-API-ERD 3.5). TMDB Discover, 하루 캐시. */
import { cachedJson, putJson } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json, upstreamJson } from './http'
import { LIMITS, takeQuota } from './quota'

const ATTRIBUTION = 'This product uses the TMDB API but is not endorsed or certified by TMDB.'
const ORIGINAL: Record<Lang, string> = { ja: 'ja', zh: 'zh', tw: 'zh', en: 'en', mn: 'mn' }
const COUNTRY: Partial<Record<Lang, string>> = { tw: 'TW', zh: 'CN' }

/** 직접 고른 학습 추천 표시 (src/content/netflixPicks.ts 와 같은 작품, 원제로 찾는다) */
const PICKS: Record<string, string> = {
  舞妓さんちのまかないさん: '부엌·식사 대화가 많고 말이 느려요',
  '深夜食堂 -Tokyo Stories-': '짧은 이야기, 손님과 주고받는 말',
  'First Love 初恋': '잔잔한 일상 대화',
  今際の国のアリス: '말이 빨라요 · 익숙해진 뒤 추천',
  想見你: '대만 학교·일상 대화',
  比悲傷更悲傷的故事: '느린 말, 잔잔한 대화',
  華燈初上: '대만 넷플릭스 오리지널',
  流浪地球: '표준 중국어 · 말이 빨라요',
  Heartstopper: '쉬운 학교 대화',
  'Emily in Paris': '짧은 일상·직장 대화',
  Wednesday: '또박또박한 말투',
  'Stranger Things': '친구끼리 쓰는 말 · 빠름',
}

interface Discover {
  results: { id: number; name?: string; title?: string; original_name?: string; original_title?: string; first_air_date?: string; release_date?: string; poster_path?: string | null }[]
}

export async function netflix(url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  const type = url.searchParams.get('type') === 'movie' ? 'movie' : 'tv'
  const day = new Date(deps.now()).toISOString().slice(0, 10)
  const key = `netflix:${lang}:${type}:${day}`
  const hit = await cachedJson<unknown>(env.KV, key)
  if (hit) return json(hit, { headers: { 'x-cache': 'hit' } })
  if (!env.TMDB_TOKEN) throw new ApiError('NOT_CONFIGURED', 'TMDB 키가 아직 없어요.')
  const quota = await takeQuota(env.KV, 'netflix', LIMITS.netflix, deps.now())
  if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 추천은 더 불러올 수 없어요.', quota.resetSec)

  const u = new URL(`https://api.themoviedb.org/3/discover/${type}`)
  const params: Record<string, string> = {
    with_watch_providers: '8', watch_region: 'KR', with_original_language: ORIGINAL[lang], sort_by: 'popularity.desc', language: 'ko-KR', page: '1',
  }
  if (COUNTRY[lang]) params.with_origin_country = COUNTRY[lang]!
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  const found = await upstreamJson<Discover>(await deps.fetch(u, { headers: { authorization: `Bearer ${env.TMDB_TOKEN}`, accept: 'application/json' } }), 'TMDB')

  const body = {
    region: 'KR',
    items: found.results.slice(0, 12).map((r) => {
      const original = r.original_name ?? r.original_title ?? ''
      const date = r.first_air_date || r.release_date || ''
      return {
        tmdbId: r.id,
        type,
        title: r.name ?? r.title ?? original,
        originalTitle: original,
        year: date ? Number(date.slice(0, 4)) : null,
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w185${r.poster_path}` : null,
        pick: PICKS[original] ?? null,
      }
    }),
    attribution: ATTRIBUTION,
  }
  await putJson(env.KV, key, body, 2 * 86_400)
  return json(body)
}
