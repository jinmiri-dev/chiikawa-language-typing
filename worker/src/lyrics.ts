/**
 * GET /lyrics — 외국인 한국어 배우기: 한국어 가사(자막)와 학습자 모국어 뜻.
 * lang 은 학습자 모국어. 고른 영상만 쓰므로 한 번 받으면 기한 없이 저장해 자막 서비스를 다시 부르지 않는다.
 */
import { cachedJson, putJson } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json } from './http'
import { LIMITS, quotaHeaders, takeQuota } from './quota'
import { aiTranslate } from './ai'
import { videoMeta } from './songs'
import { findSource, mergeCues, practiceLines, type Cue } from './transcript'


export interface LyricLine {
  start: number
  end: number
  ko: string
  meaning?: string
}

const PROMO = /구독|좋아요|알림\s*설정|채널|subscribe|like\s*and/i
const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
/**
 * 가사 줄 정리: 채널 홍보 줄("구독 좋아요", 채널 이름)과, 앞뒤 줄과 같은 글인 아주 짧은 줄(0.5초 미만, 자막 겹침)을 뺀다.
 */
export function tidyLyrics(lines: Cue[], channel: string): Cue[] {
  const ch = squash(channel)
  const kept = lines.filter((l) => {
    const t = squash(l.text)
    if (!t) return false
    if (PROMO.test(l.text)) return false
    if (t.length >= 4 && ch.includes(t)) return false
    return true
  })
  return kept.filter((l, i) => !(l.end - l.start < 0.5 && (kept[i - 1]?.text === l.text || kept[i + 1]?.text === l.text)))
}

export async function lyrics(url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  const v = url.searchParams.get('v') ?? ''
  if (!/^[\w-]{11}$/.test(v)) throw new ApiError('BAD_REQUEST', '영상 id(v)가 잘못됐어요.')
  const key = `lyrics:v2:${v}:${lang}`
  const hit = await cachedJson<unknown>(env.KV, key)
  if (hit) return json(hit, { headers: { 'x-cache': 'hit' } })
  const meta = await videoMeta(env, deps, v)
  if (meta && !meta.embeddable) throw new ApiError('EMBED_BLOCKED', '영상 주인이 다른 사이트에서 재생하지 못하게 막아 두었어요.')
  // 한국어 자막(또는 가사)은 영상마다 한 번만 받아 둔다(모국어가 달라도 같다). 하루 상한은 새 영상을 받을 때만 쓴다
  const koKey = `lyrics-ko:v1:${v}`
  let src = await cachedJson<{ cues: Cue[]; auto: boolean; via?: 'captions' | 'lyrics' }>(env.KV, koKey)
  let quota: { ok: boolean; remaining: number; resetSec: number } = { ok: true, remaining: LIMITS.transcript, resetSec: 0 }
  if (!src) {
    quota = await takeQuota(env.KV, 'transcript', LIMITS.transcript, deps.now(), 1, deps.ip)
    if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 새 영상 자막은 다 받았어요.', quota.resetSec)
    const got = await findSource(env, deps, v, 'ko', meta)
    src = { ...got.src, via: got.via }
    await putJson(env.KV, koKey, src)
  }
  const kept = practiceLines(src.cues, 'ko')
  const lines = tidyLyrics(src.auto ? mergeCues(kept, 'ko') : kept, meta?.channel ?? '')
  if (!lines.length) throw new ApiError('NO_TRACK', '이 영상에는 한국어 줄이 없어요.')

  // 뜻: 우리 줄을 한 줄씩 그대로 번역한다(줄과 뜻이 늘 1:1). 유튜브 번역 자막은 줄 나눔이 달라 뜻이 밀리므로 쓰지 않는다.
  // 번역을 못 하면 틀린 뜻을 붙이지 않고 비워 두고, 하루 뒤 다시 번역한다.
  let out: LyricLine[] = lines.map((l) => ({ start: l.start, end: l.end, ko: l.text }))
  let meaningSource: 'auto' | 'none' = 'none'
  const t = await aiTranslate(env, deps, 'ko', lang, out.map((l) => l.ko))
  if (t) {
    out = out.map((l, i) => (t[i] ? { ...l, meaning: t[i] } : l))
    // 거의 다 옮겼을 때만 끝난 것으로(빠진 줄이 많으면 하루 뒤 다시 번역)
    if (t.filter(Boolean).length >= t.length * 0.9) meaningSource = 'auto'
  }
  const body = { videoId: v, to: lang, source: src.via === 'lyrics' ? 'lyrics' : src.auto ? 'asr' : 'manual', meaningSource, lines: out }
  await putJson(env.KV, key, body, meaningSource === 'none' ? 86400 : undefined)
  return json(body, { headers: quotaHeaders(quota) })
}
