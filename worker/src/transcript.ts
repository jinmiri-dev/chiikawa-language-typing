/** GET /transcript — 영상 자막과 한국어 (기획안 8장, 아키텍처-API-ERD 3.3). 캐시 30일, 새 영상 하루 60개. */
import { cachedJson, putJson } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json } from './http'
import { LIMITS, quotaHeaders, useQuota } from './quota'

export interface Cue {
  start: number
  end: number
  text: string
}
export interface TranscriptLine {
  start: number
  end: number
  src: string
  ko?: string
}

/** 유튜브 자막 언어 코드(앞에서부터 찾는다) */
const TRACK: Record<Lang, string[]> = {
  ja: ['ja'], en: ['en', 'en-US', 'en-GB'], zh: ['zh-Hans', 'zh-CN', 'zh'], tw: ['zh-Hant', 'zh-TW'], mn: ['mn'],
}
/** 번역 API 원문 언어 코드 */
const TRANSLATE_FROM: Record<Lang, string> = { ja: 'ja', en: 'en', zh: 'zh-Hans', tw: 'zh-Hant', mn: 'mn-Cyrl' }

const END = /[。！？!?.…]$/
const MIN = 2
const MAX = 12
const GAP = 1.2

/** 자동 자막 조각을 연습하기 알맞은 줄(2~12초)로 합친다. 문장부호나 조용한 틈에서 끊는다. */
export function mergeCues(cues: Cue[], lang: Lang = 'ja'): Cue[] {
  const join = lang === 'en' || lang === 'mn' ? ' ' : ''
  const out: Cue[] = []
  let cur: Cue | null = null
  for (const c of cues) {
    if (cur && (c.start - cur.end > GAP || c.end - cur.start > MAX)) {
      out.push(cur)
      cur = null
    }
    cur = cur ? { start: cur.start, end: c.end, text: cur.text + join + c.text.trim() } : { ...c, text: c.text.trim() }
    if (cur.end - cur.start >= MIN && END.test(cur.text)) {
      out.push(cur)
      cur = null
    }
  }
  if (cur) out.push(cur)
  return out
}

/** 한국어 자막을 시간이 가장 많이 겹치는 원문 줄에 붙인다 */
export function pairKo(lines: Cue[], ko: Cue[]): TranscriptLine[] {
  const parts: string[][] = lines.map(() => [])
  const overlap = (a: Cue, b: Cue) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start))
  for (const k of ko) {
    let best = -1
    let most = 0
    lines.forEach((l, i) => {
      const o = overlap(l, k)
      if (o > most) [best, most] = [i, o]
    })
    if (best >= 0) parts[best].push(k.text.trim())
  }
  return lines.map((l, i) => ({ start: l.start, end: l.end, src: l.text, ...(parts[i].length ? { ko: parts[i].join(' ') } : {}) }))
}

/** 자동 자막처럼 보이나(문장부호가 없고 조각이 짧다) */
const looksAuto = (cues: Cue[]) => !cues.some((c) => /[。！？!?.,、，]/.test(c.text)) && cues.reduce((a, c) => a + (c.end - c.start), 0) / cues.length < 2.5

/** 자막 서비스 어댑터 (SearchAPI youtube_transcripts). 응답 모양은 실제 키로 확인한 뒤 맞춘다. */
async function fetchTrack(env: Env, deps: Deps, v: string, code: string): Promise<Cue[] | null> {
  const u = new URL('https://www.searchapi.io/api/v1/search')
  u.searchParams.set('engine', 'youtube_transcripts')
  u.searchParams.set('video_id', v)
  u.searchParams.set('lang', code)
  u.searchParams.set('api_key', env.TRANSCRIPT_API_KEY!)
  const res = await deps.fetch(u)
  if (res.status === 404 || res.status === 400) return null
  if (!res.ok) throw new ApiError('UPSTREAM_FAILED', '자막 서비스가 응답하지 않았어요. 잠시 뒤 다시 해 보세요.')
  const body = (await res.json()) as { transcripts?: { text: string; start: number; duration: number }[]; error?: string }
  if (body.error || !body.transcripts?.length) return null
  return body.transcripts.filter((t) => t.text?.trim()).map((t) => ({ start: t.start, end: t.start + t.duration, text: t.text.replace(/\s*\n\s*/g, ' ') }))
}

async function firstTrack(env: Env, deps: Deps, v: string, codes: string[]): Promise<Cue[] | null> {
  for (const c of codes) {
    const cues = await fetchTrack(env, deps, v, c)
    if (cues) return cues
  }
  return null
}

/** 한국어 자막이 없으면 번역으로 채운다(Azure Translator, 100줄씩). 실패하면 null */
async function translate(env: Env, deps: Deps, lang: Lang, texts: string[]): Promise<string[] | null> {
  if (!env.AZURE_TRANSLATOR_KEY) return null
  const out: string[] = []
  for (let i = 0; i < texts.length; i += 100) {
    const u = new URL('https://api.cognitive.microsofttranslator.com/translate')
    u.searchParams.set('api-version', '3.0')
    u.searchParams.set('from', TRANSLATE_FROM[lang])
    u.searchParams.set('to', 'ko')
    const res = await deps.fetch(u, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'ocp-apim-subscription-key': env.AZURE_TRANSLATOR_KEY,
        ...(env.AZURE_TRANSLATOR_REGION ? { 'ocp-apim-subscription-region': env.AZURE_TRANSLATOR_REGION } : {}),
      },
      body: JSON.stringify(texts.slice(i, i + 100).map((Text) => ({ Text }))),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { translations: { text: string }[] }[]
    out.push(...body.map((b) => b.translations[0]?.text ?? ''))
  }
  return out
}

async function embeddable(env: Env, deps: Deps, v: string): Promise<boolean> {
  if (!env.YOUTUBE_API_KEY) return true
  const u = new URL('https://www.googleapis.com/youtube/v3/videos')
  u.searchParams.set('part', 'status')
  u.searchParams.set('id', v)
  u.searchParams.set('key', env.YOUTUBE_API_KEY)
  const res = await deps.fetch(u)
  if (!res.ok) return true // 확인 못 하면 막지 않는다(재생 화면이 다시 알려 줌)
  const body = (await res.json()) as { items?: { status?: { embeddable?: boolean } }[] }
  return body.items?.[0]?.status?.embeddable !== false
}

export async function transcript(url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  const v = url.searchParams.get('v') ?? ''
  if (!/^[\w-]{11}$/.test(v)) throw new ApiError('BAD_REQUEST', '영상 id(v)가 잘못됐어요.')
  const key = `transcript:${v}:${lang}`
  const hit = await cachedJson<unknown>(env.KV, key)
  if (hit) return json(hit, { headers: { 'x-cache': 'hit' } })
  if (!env.TRANSCRIPT_API_KEY) throw new ApiError('NOT_CONFIGURED', '자막 서비스 키가 아직 없어요.')

  if (!(await embeddable(env, deps, v))) throw new ApiError('EMBED_BLOCKED', '영상 주인이 다른 사이트에서 재생하지 못하게 막아 두었어요.')
  const quota = await useQuota(env.KV, 'transcript', LIMITS.transcript, deps.now())
  if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 새 영상 자막은 다 받았어요. 저장한 영상과 대본은 계속 쓸 수 있어요.', quota.resetSec)

  const src = await firstTrack(env, deps, v, TRACK[lang])
  if (!src) throw new ApiError('NO_TRACK', '이 영상에는 그 언어 자막이 없어요.')
  const auto = looksAuto(src)
  const lines = auto ? mergeCues(src, lang) : src

  let koSource: 'youtube' | 'auto' | 'none' = 'none'
  let out: TranscriptLine[] = lines.map((l) => ({ start: l.start, end: l.end, src: l.text }))
  const ko = await firstTrack(env, deps, v, ['ko'])
  if (ko) {
    out = pairKo(lines, ko)
    koSource = 'youtube'
  } else {
    const t = await translate(env, deps, lang, out.map((l) => l.src))
    if (t) {
      out = out.map((l, i) => (t[i] ? { ...l, ko: t[i] } : l))
      koSource = 'auto'
    }
  }
  const body = { videoId: v, lang, source: auto ? 'asr' : 'manual', koSource, lines: out }
  await putJson(env.KV, key, body, 30 * 86_400)
  return json(body, { headers: quotaHeaders(quota) })
}
