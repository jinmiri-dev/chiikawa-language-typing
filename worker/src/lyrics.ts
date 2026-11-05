/**
 * GET /lyrics — 외국인 한국어 배우기: 한국어 가사(자막)와 학습자 모국어 뜻.
 * lang 은 학습자 모국어. 고른 영상만 쓰므로 한 번 받으면 기한 없이 저장해 자막 서비스를 다시 부르지 않는다.
 */
import { cachedJson, putJson } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json } from './http'
import { LIMITS, quotaHeaders, takeQuota } from './quota'
import { embeddable, fetchTrack, mergeCues, pairKo, practiceLines, sourceTrack, tidyKo, type Cue } from './transcript'

/** 모국어 → 유튜브 자막(번역) 언어 코드 */
const MEANING_TRACK: Record<Lang, string> = { zh: 'zh-Hans', tw: 'zh-Hant', mn: 'mn', ja: 'ja', en: 'en' }

export interface LyricLine {
  start: number
  end: number
  ko: string
  meaning?: string
}

export async function lyrics(url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  const v = url.searchParams.get('v') ?? ''
  if (!/^[\w-]{11}$/.test(v)) throw new ApiError('BAD_REQUEST', '영상 id(v)가 잘못됐어요.')
  const key = `lyrics:v1:${v}:${lang}`
  const hit = await cachedJson<unknown>(env.KV, key)
  if (hit) return json(hit, { headers: { 'x-cache': 'hit' } })
  if (!env.TRANSCRIPT_API_KEY) throw new ApiError('NOT_CONFIGURED', '자막 서비스 키가 아직 없어요.')

  if (!(await embeddable(env, deps, v))) throw new ApiError('EMBED_BLOCKED', '영상 주인이 다른 사이트에서 재생하지 못하게 막아 두었어요.')
  const quota = await takeQuota(env.KV, 'transcript', LIMITS.transcript, deps.now())
  if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 새 영상 자막은 다 받았어요.', quota.resetSec)

  // 한국어 자막은 영상마다 한 번만 받아 둔다(모국어가 달라도 같다)
  const koKey = `lyrics-ko:v1:${v}`
  let src = await cachedJson<{ cues: Cue[]; auto: boolean }>(env.KV, koKey)
  if (!src) {
    src = await sourceTrack(env, deps, v, 'ko')
    if (!src) throw new ApiError('NO_TRACK', '이 영상에는 한국어 자막이 없어요.')
    await putJson(env.KV, koKey, src)
  }
  const kept = practiceLines(src.cues, 'ko')
  const lines = src.auto ? mergeCues(kept, 'ko') : kept
  if (!lines.length) throw new ApiError('NO_TRACK', '이 영상에는 한국어 줄이 없어요.')

  // 뜻: 원문과 같은 종류 자막의 번역을 받아야 시간이 맞는다. 줄과 거의 안 맞으면(30% 미만) 버린다.
  let out: LyricLine[] = lines.map((l) => ({ start: l.start, end: l.end, ko: l.text }))
  let meaningSource: 'youtube' | 'none' = 'none'
  for (const type of src.auto ? (['auto'] as const) : (['manual', 'auto'] as const)) {
    const tr = await fetchTrack(env, deps, v, { lang: MEANING_TRACK[lang], type })
    if (!tr) continue
    const paired = pairKo(lines, tidyKo(tr.cues))
    if (paired.filter((l) => l.ko).length >= paired.length * 0.3) {
      out = paired.map((p) => ({ start: p.start, end: p.end, ko: p.src, ...(p.ko ? { meaning: p.ko } : {}) }))
      meaningSource = 'youtube'
      break
    }
  }
  const body = { videoId: v, to: lang, source: src.auto ? 'asr' : 'manual', meaningSource, lines: out }
  await putJson(env.KV, key, body)
  return json(body, { headers: quotaHeaders(quota) })
}
