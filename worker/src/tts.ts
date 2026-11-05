/** GET /tts — 여자/남자 목소리 (기획안 10장, 아키텍처-API-ERD 3.4). Azure 신경망 음성, 영구 캐시, 하루 2만 자. */
import { sha } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError } from './http'
import { LIMITS, quotaHeaders, takeQuota } from './quota'

const LOCALE: Record<Lang, string> = { ja: 'ja-JP', zh: 'zh-CN', tw: 'zh-TW', en: 'en-US', mn: 'mn-MN' }
export const VOICES: Record<Lang, { female: string; male: string }> = {
  ja: { female: 'ja-JP-NanamiNeural', male: 'ja-JP-KeitaNeural' },
  zh: { female: 'zh-CN-XiaoxiaoNeural', male: 'zh-CN-YunxiNeural' },
  tw: { female: 'zh-TW-HsiaoChenNeural', male: 'zh-TW-YunJheNeural' },
  en: { female: 'en-US-JennyNeural', male: 'en-US-GuyNeural' },
  mn: { female: 'mn-MN-YesuiNeural', male: 'mn-MN-BataaNeural' },
}
const MAX_CHARS = 300

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!)

export function ssml(lang: Lang, voice: string, text: string, rate: 1 | 0.75): string {
  return `<speak version='1.0' xml:lang='${LOCALE[lang]}'><voice name='${voice}'><prosody rate='${rate === 1 ? '0%' : '-25%'}'>${escapeXml(text)}</prosody></voice></speak>`
}

export async function tts(url: URL, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  const voice = url.searchParams.get('voice')
  const text = (url.searchParams.get('text') ?? '').trim()
  const rate = url.searchParams.get('rate') === '0.75' ? 0.75 : 1
  if (voice !== 'female' && voice !== 'male') throw new ApiError('BAD_REQUEST', '목소리(voice)는 female 이나 male 이에요.')
  if (!text || [...text].length > MAX_CHARS) throw new ApiError('BAD_REQUEST', `글(text)은 1~${MAX_CHARS}자예요.`)

  const headers = { 'content-type': 'audio/mpeg', 'cache-control': 'public, max-age=31536000, immutable' }
  const key = `tts:${lang}:${voice}:${rate}:${await sha(text)}`
  const hit = await env.KV.get(key, 'arrayBuffer')
  if (hit) return new Response(hit, { headers: { ...headers, 'x-cache': 'hit' } })
  if (!env.AZURE_SPEECH_KEY || !env.AZURE_SPEECH_REGION) throw new ApiError('NOT_CONFIGURED', '음성 합성 키가 아직 없어요.')

  const quota = await takeQuota(env.KV, 'tts', LIMITS.tts, deps.now(), [...text].length, deps.ip)
  if (!quota.ok) throw new ApiError('QUOTA_EXCEEDED', '오늘 목소리 만들기는 다 썼어요. 기기 목소리로 들을 수 있어요.', quota.resetSec)

  const res = await deps.fetch(`https://${env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'ocp-apim-subscription-key': env.AZURE_SPEECH_KEY,
      'content-type': 'application/ssml+xml',
      'x-microsoft-outputformat': 'audio-24khz-48kbitrate-mono-mp3',
      'user-agent': 'language-grade1',
    },
    body: ssml(lang, VOICES[lang][voice], text, rate),
  })
  if (!res.ok) throw new ApiError('UPSTREAM_FAILED', '목소리를 만들지 못했어요. 기기 목소리로 들어 보세요.')
  const audio = await res.arrayBuffer()
  await env.KV.put(key, audio)
  return new Response(audio, { headers: { ...headers, ...quotaHeaders(quota) } })
}
