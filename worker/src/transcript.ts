/** GET /transcript — 영상 자막과 한국어 (기획안 8장, 아키텍처-API-ERD 3.3). 캐시 30일, 새 영상 하루 60개. */
import { cachedJson, putJson } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json } from './http'
import { LIMITS, quotaHeaders, takeQuota } from './quota'

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

/** 원문 자막 언어: 배울 언어 다섯, 그리고 외국인이 배우는 한국어(/lyrics) */
export type SrcLang = Lang | 'ko'

/** 유튜브 자막 언어 코드(앞에서부터 찾는다) */
const TRACK: Record<SrcLang, string[]> = {
  ko: ['ko'],
  ja: ['ja'], en: ['en', 'en-US', 'en-GB'], zh: ['zh-Hans', 'zh-CN', 'zh'], tw: ['zh-Hant', 'zh-TW'], mn: ['mn'],
}
/** 번역 API 원문 언어 코드 */
const TRANSLATE_FROM: Record<Lang, string> = { ja: 'ja', en: 'en', zh: 'zh-Hans', tw: 'zh-Hant', mn: 'mn-Cyrl' }

const END = /[。！？!?.…]$/
const MIN = 2
const MAX = 12
const GAP = 1.2

/** 자동 자막 조각을 연습하기 알맞은 줄(2~12초)로 합친다. 문장부호나 조용한 틈에서 끊는다. */
export function mergeCues(cues: Cue[], lang: SrcLang = 'ja'): Cue[] {
  const join = lang === 'en' || lang === 'mn' || lang === 'ko' ? ' ' : ''
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

/** 그 언어 글자. 이 글자가 하나도 없는 줄(통째로 영어·로마자)은 연습에서 건너뛴다 */
const SCRIPT: Record<SrcLang, RegExp> = {
  ko: /\p{Script=Hangul}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  zh: /\p{Script=Han}/u,
  tw: /\p{Script=Han}/u,
  mn: /\p{Script=Cyrillic}/u,
  en: /\p{Script=Latin}/u,
}
const LANG_KO: Record<SrcLang, string> = { ko: '한국어', ja: '일본어', zh: '중국어', tw: '대만어', mn: '몽골어', en: '영어' }
/** [Music]·[音楽]·(박수) 같은 표시 */
const TAGS = /\[[^\]]*\]|［[^］]*］|\([^)]*\)|（[^）]*）/g

/** 칠 수 없는 글자(그림 문자·음표)와 줄 앞에 떨어져 붙은 문장부호를 지운다 */
const clean = (s: string) =>
  s.replace(/\p{Extended_Pictographic}️?|[♪♫♬♡]/gu, ' ').replace(/\s+/g, ' ').replace(/^[\s。、，,.]+/, '').trim()

/** 연습할 줄만 남긴다. 다른 언어가 섞인 줄은 그대로 친다. */
export function practiceLines(cues: Cue[], lang: SrcLang): Cue[] {
  return cues.map((c) => ({ ...c, text: clean(c.text) })).filter((c) => SCRIPT[lang].test(c.text.replace(TAGS, '')))
}

/** 자막 대부분이 그 언어 글자인가(일본어 자막이 로마자뿐인 영상 걸러내기) */
const native = (cues: Cue[], lang: SrcLang) => practiceLines(cues, lang).length >= cues.length * 0.5

const SENT_END = /^(.*[.?!…。？！])\s+(\S.*)$/su
/** 끝까지 문장이면 옮기지 않는다 */
const ENDS = /[.?!…。？！]$/
const FRAGMENT = /^\S{1,2}$/
/**
 * 유튜브 번역 자막은 원문 조각 경계에서 잘려 "같아요. 여 / 보세요"처럼 낱말이 갈린다.
 * 문장 끝 뒤에 남은 조각(과 표시 뒤에 홀로 남은 짧은 조각)은 다음 자막 앞으로 옮긴다.
 */
export function tidyKo(ko: Cue[]): Cue[] {
  const out: Cue[] = []
  let carry = ''
  const join = (a: string, b: string) => (!a ? b : !b ? a : FRAGMENT.test(a) ? a + b : `${a} ${b}`)
  ko.forEach((k, i) => {
    const raw = clean(k.text.replace(TAGS, ' '))
    const last = i === ko.length - 1
    let text = join(carry, raw)
    carry = ''
    const m = SENT_END.exec(text)
    if (!last && m && !ENDS.test(m[2])) [text, carry] = [m[1], m[2]]
    else if (!last && raw !== k.text.trim() && FRAGMENT.test(text)) [text, carry] = ['', text]
    if (text) out.push({ ...k, text })
  })
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

interface Track {
  cues: Cue[]
  /** 이 영상에 있는 자막 이름들 (자동 자막은 이름에 "(auto-generated)") */
  available: { name: string; lang: string }[]
}
type Pick = { lang: string; type: 'manual' | 'auto' } | { name: string }
const AUTO_NAME = /auto-generated/i

/** 자막 서비스 어댑터 (SearchAPI youtube_transcripts) */
export async function fetchTrack(env: Env, deps: Deps, v: string, pick: Pick): Promise<Track | null> {
  const u = new URL('https://www.searchapi.io/api/v1/search')
  u.searchParams.set('engine', 'youtube_transcripts')
  u.searchParams.set('video_id', v)
  if ('name' in pick) u.searchParams.set('transcript_name', pick.name)
  else {
    u.searchParams.set('lang', pick.lang)
    u.searchParams.set('transcript_type', pick.type)
  }
  u.searchParams.set('api_key', env.TRANSCRIPT_API_KEY!)
  const res = await deps.fetch(u)
  if (res.status === 404 || res.status === 400) return null
  if (!res.ok) throw new ApiError('UPSTREAM_FAILED', '자막 서비스가 응답하지 않았어요. 잠시 뒤 다시 해 보세요.')
  const body = (await res.json()) as { transcripts?: { text: string; start: number; duration: number }[]; available_languages?: Track['available']; error?: string }
  if (body.error || !body.transcripts?.length) return null
  const cues = body.transcripts.filter((t) => t.text?.trim()).map((t) => ({ start: t.start, end: t.start + t.duration, text: t.text.replace(/\s*\n\s*/g, ' ') }))
  return { cues, available: body.available_languages ?? [] }
}

/**
 * 원문 자막: 직접 올린 자막을 먼저 받는다. 받은 자막이 로마자처럼 그 언어 글자가 아니면
 * 같은 언어의 다른 자막(자동 자막 등)을 이름으로 두 개까지 더 찾아본다.
 */
export async function sourceTrack(env: Env, deps: Deps, v: string, lang: SrcLang): Promise<{ cues: Cue[]; auto: boolean } | null> {
  let foreign = false
  for (const code of TRACK[lang]) {
    const got = await fetchTrack(env, deps, v, { lang: code, type: 'manual' })
    if (!got) continue
    const names = got.available.filter((a) => a.lang === code)
    // 직접 올린 자막이 하나라도 있으면 그걸 받은 것(manual 우선)
    const auto = names.length > 0 && names.every((a) => AUTO_NAME.test(a.name))
    if (native(got.cues, lang)) return { cues: got.cues, auto: auto || looksAuto(got.cues) }
    foreign = true
    const firstManual = names.find((a) => !AUTO_NAME.test(a.name))
    const others = names.filter((a) => a !== firstManual).sort((a, b) => Number(AUTO_NAME.test(b.name)) - Number(AUTO_NAME.test(a.name)))
    for (const o of others.slice(0, 2)) {
      const alt = await fetchTrack(env, deps, v, { name: o.name })
      if (alt && native(alt.cues, lang)) return { cues: alt.cues, auto: AUTO_NAME.test(o.name) || looksAuto(alt.cues) }
    }
  }
  if (foreign) throw new ApiError('NO_TRACK', `이 영상의 ${LANG_KO[lang]} 자막은 로마자 같은 다른 글자뿐이에요. ${LANG_KO[lang]} 글자 자막이 있는 영상을 골라 주세요.`)
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

export async function embeddable(env: Env, deps: Deps, v: string): Promise<boolean> {
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
  const key = `transcript:v6:${v}:${lang}`
  const hit = await cachedJson<unknown>(env.KV, key)
  if (hit) return json(hit, { headers: { 'x-cache': 'hit' } })
  if (!env.TRANSCRIPT_API_KEY) throw new ApiError('NOT_CONFIGURED', '자막 서비스 키가 아직 없어요.')

  if (!(await embeddable(env, deps, v))) throw new ApiError('EMBED_BLOCKED', '영상 주인이 다른 사이트에서 재생하지 못하게 막아 두었어요.')
  const quota = await takeQuota(env.KV, 'transcript', LIMITS.transcript, deps.now(), 1, deps.ip)
  if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 새 영상 자막은 다 받았어요. 저장한 영상과 대본은 계속 쓸 수 있어요.', quota.resetSec)

  const src = await sourceTrack(env, deps, v, lang)
  if (!src) throw new ApiError('NO_TRACK', '이 영상에는 그 언어 자막이 없어요.')
  const { auto } = src
  // [Music]·통째로 다른 언어인 조각은 빼고, 자동 자막이면 문장 단위로 합친다
  const kept = practiceLines(src.cues, lang)
  const lines = auto ? mergeCues(kept, lang) : kept
  if (!lines.length) throw new ApiError('NO_TRACK', `이 영상에는 연습할 ${LANG_KO[lang]} 줄이 없어요.`)

  let koSource: 'youtube' | 'auto' | 'none' = 'none'
  let out: TranscriptLine[] = lines.map((l) => ({ start: l.start, end: l.end, src: l.text }))
  // 한국어도 원문과 같은 종류 자막을 기준으로 받아야 시간이 맞는다. 직접 올린 한국어가 없으면 자동 번역이라도 받는다.
  // 소리를 한국어로 잘못 알아들은 자동 자막처럼 줄과 거의 안 맞는 한국어(30% 미만)는 버린다.
  let paired: TranscriptLine[] | null = null
  for (const type of auto ? (['auto'] as const) : (['manual', 'auto'] as const)) {
    const ko = await fetchTrack(env, deps, v, { lang: 'ko', type })
    if (!ko) continue
    const p = pairKo(lines, tidyKo(ko.cues))
    if (p.filter((l) => l.ko).length >= p.length * 0.3) {
      paired = p
      break
    }
  }
  if (paired) {
    out = paired
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
