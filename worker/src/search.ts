/** GET /search — 유튜브 검색 (아키텍처-API-ERD 3.2). 자막 있고 퍼가기 되는 영상만. 캐시 1시간, 하루 90회. */
import { cachedJson, putJson, sha } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json, upstreamJson } from './http'
import { LIMITS, quotaHeaders, useQuota } from './quota'

export const TAGS = ['song', 'kids', 'drama', 'movie', 'variety', 'news', 'vlog'] as const
export type Tag = (typeof TAGS)[number]

/** 태그를 누르면 그 언어로 찾는 검색어 (기획안 7.4) */
export const TAG_QUERY: Record<Lang, Record<Tag, string>> = {
  ja: { song: '歌 歌詞', kids: '童謡', drama: 'ドラマ 名場面', movie: '映画 予告', variety: 'バラエティ', news: 'ニュース', vlog: 'vlog 日常' },
  tw: { song: '歌詞 MV', kids: '兒歌', drama: '台劇', movie: '電影 預告', variety: '綜藝', news: '新聞', vlog: 'vlog 台灣' },
  zh: { song: '歌词 MV', kids: '儿歌', drama: '电视剧 片段', movie: '电影 预告', variety: '综艺', news: '新闻', vlog: 'vlog 日常' },
  en: { song: 'song lyrics', kids: 'nursery rhymes', drama: 'drama scene', movie: 'movie trailer', variety: 'talk show', news: 'news', vlog: 'daily vlog' },
  mn: { song: 'дуу', kids: 'хүүхдийн дуу', drama: 'монгол кино', movie: 'кино', variety: 'шоу', news: 'мэдээ', vlog: 'влог' },
}
const RELEVANCE: Record<Lang, string> = { ja: 'ja', tw: 'zh-Hant', zh: 'zh-Hans', en: 'en', mn: 'mn' }
const REGION: Partial<Record<Lang, string>> = { tw: 'TW', ja: 'JP', mn: 'MN' }

export interface VideoItem {
  videoId: string
  title: string
  channel: string
  durationSec: number
  thumbnail: string
  embeddable: boolean
}

/** `PT1H2M3S` → 초 */
export function isoDuration(s: string): number {
  const m = s.match(/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?/)
  if (!m) return 0
  const [d, h, mi, se] = m.slice(1).map((x) => Number(x ?? 0))
  return d * 86400 + h * 3600 + mi * 60 + se
}

/** 유튜브 제목의 HTML 글자(&amp; &#39;)를 푼다 */
const unescape = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|#39|#(\d+));/g, (_, n: string, code?: string) => (code ? String.fromCharCode(Number(code)) : ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" } as Record<string, string>)[n]))

interface SearchApi {
  nextPageToken?: string
  items: { id: { videoId: string }; snippet: { title: string; channelTitle: string; thumbnails: { medium?: { url: string } } } }[]
}
interface VideosApi {
  items: { id: string; contentDetails?: { duration: string }; status?: { embeddable: boolean } }[]
}

export async function search(url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  const tag = url.searchParams.get('tag') as Tag | null
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100) || (tag && TAGS.includes(tag) ? TAG_QUERY[lang][tag] : '')
  if (!q) throw new ApiError('BAD_REQUEST', '검색어(q)나 태그(tag)가 필요해요.')
  const page = url.searchParams.get('pageToken') ?? ''
  const key = `search:${lang}:${tag ?? '-'}:${await sha(q, 'SHA-1')}:${page || '1'}`

  const hit = await cachedJson<unknown>(env.KV, key)
  if (hit) return json(hit, { headers: { 'x-cache': 'hit' } })
  if (!env.YOUTUBE_API_KEY) throw new ApiError('NOT_CONFIGURED', '유튜브 검색 키가 아직 없어요.')

  const quota = await useQuota(env.KV, 'search', LIMITS.search, deps.now())
  if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 검색은 다 썼어요. 링크 붙여넣기와 대본은 계속 쓸 수 있어요.', quota.resetSec)

  const s = new URL('https://www.googleapis.com/youtube/v3/search')
  const params: Record<string, string> = {
    part: 'snippet', type: 'video', maxResults: '12', q, videoCaption: 'closedCaption', videoEmbeddable: 'true',
    safeSearch: 'strict', relevanceLanguage: RELEVANCE[lang], key: env.YOUTUBE_API_KEY,
  }
  if (REGION[lang]) params.regionCode = REGION[lang]!
  if (page) params.pageToken = page
  for (const [k, v] of Object.entries(params)) s.searchParams.set(k, v)
  const found = await upstreamJson<SearchApi>(await deps.fetch(s), '유튜브')

  const ids = found.items.map((i) => i.id.videoId)
  const details = new Map<string, VideosApi['items'][number]>()
  if (ids.length) {
    const v = new URL('https://www.googleapis.com/youtube/v3/videos')
    v.searchParams.set('part', 'contentDetails,status')
    v.searchParams.set('id', ids.join(','))
    v.searchParams.set('key', env.YOUTUBE_API_KEY)
    for (const it of (await upstreamJson<VideosApi>(await deps.fetch(v), '유튜브')).items) details.set(it.id, it)
  }
  const body = {
    items: found.items.map((i): VideoItem => {
      const d = details.get(i.id.videoId)
      return {
        videoId: i.id.videoId,
        title: unescape(i.snippet.title),
        channel: unescape(i.snippet.channelTitle),
        durationSec: d?.contentDetails ? isoDuration(d.contentDetails.duration) : 0,
        thumbnail: i.snippet.thumbnails.medium?.url ?? `https://i.ytimg.com/vi/${i.id.videoId}/mqdefault.jpg`,
        embeddable: d?.status?.embeddable ?? true,
      }
    }),
    ...(found.nextPageToken ? { nextPageToken: found.nextPageToken } : {}),
  }
  await putJson(env.KV, key, body, 3600)
  return json(body, { headers: quotaHeaders(quota) })
}
