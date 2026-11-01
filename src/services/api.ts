/** 중계 함수(Cloudflare Worker) 부르기. 주소는 빌드 때 VITE_WORKER_ORIGIN. 오류는 코드로 바꿔 화면이 안내한다(와이어프레임 10). */
import { LANG_NAME, type Lang } from '../engine/lang'

export type FailureCode =
  | 'NOT_CONNECTED' | 'OFFLINE' | 'BAD_REQUEST' | 'NO_TRACK' | 'EMBED_BLOCKED' | 'QUOTA_EXCEEDED' | 'UPSTREAM_FAILED' | 'NOT_CONFIGURED' | 'FORBIDDEN' | 'NOT_FOUND'

export class ApiFailure extends Error {
  code: FailureCode
  retryAfter?: number
  constructor(code: FailureCode, message: string, retryAfter?: number) {
    super(message)
    this.code = code
    this.retryAfter = retryAfter
  }
}

export interface VideoItem {
  videoId: string
  title: string
  channel: string
  durationSec: number
  thumbnail: string
  embeddable: boolean
}
export interface TranscriptResult {
  videoId: string
  lang: Lang
  source: 'manual' | 'asr'
  koSource: 'youtube' | 'auto' | 'none'
  lines: { start: number; end: number; src: string; ko?: string }[]
}
export interface NetflixResult {
  region: string
  items: { tmdbId: number; type: 'tv' | 'movie'; title: string; originalTitle: string; year: number | null; poster: string | null; pick: string | null }[]
  attribution: string
}

export function workerOrigin(): string | null {
  const o = (import.meta.env.VITE_WORKER_ORIGIN as string | undefined)?.trim().replace(/\/+$/, '')
  return o || null
}

function url(path: string, params: Record<string, string | undefined>): string {
  const base = workerOrigin()
  if (!base) throw new ApiFailure('NOT_CONNECTED', '중계 서버가 아직 연결되지 않았어요.')
  const q = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1]))
  return `${base}${path}?${q}`
}

async function get<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const u = url(path, params)
  let res: Response
  try {
    res = await fetch(u)
  } catch {
    throw new ApiFailure('OFFLINE', '인터넷 연결을 확인해 주세요.')
  }
  if (res.ok) return (await res.json()) as T
  const body = (await res.json().catch(() => null)) as { error?: { code: FailureCode; message: string; retryAfter?: number } } | null
  throw new ApiFailure(body?.error?.code ?? 'UPSTREAM_FAILED', body?.error?.message ?? '잠시 문제가 생겼어요.', body?.error?.retryAfter)
}

export const searchVideos = (lang: Lang, p: { q?: string; tag?: string; pageToken?: string }) =>
  get<{ items: VideoItem[]; nextPageToken?: string }>('/search', { lang, ...p })
export const getTranscript = (lang: Lang, v: string) => get<TranscriptResult>('/transcript', { lang, v })
export const getNetflix = (lang: Lang) => get<NetflixResult>('/netflix', { lang })
export const ttsUrl = (lang: Lang, voice: 'female' | 'male', text: string, rate: 1 | 0.75) =>
  url('/tts', { lang, voice, text, ...(rate === 0.75 ? { rate: '0.75' } : {}) })

const wait = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.ceil((sec % 3600) / 60)
  return h ? `${h}시간${m ? ` ${m}분` : ''} 뒤` : `${m}분 뒤`
}

/** 오류 → 상태 안내(제목·설명) */
export function noticeFor(e: unknown, lang: Lang): { title: string; body: string } {
  const f = e instanceof ApiFailure ? e : new ApiFailure('UPSTREAM_FAILED', '')
  const name = LANG_NAME[lang].ko
  switch (f.code) {
    case 'QUOTA_EXCEEDED':
      return { title: '오늘 검색은 다 썼어요', body: `${f.retryAfter ? `${wait(f.retryAfter)} 다시 채워져요. ` : '내일 다시 채워져요. '}링크 붙여넣기, 저장한 영상, 대본은 계속 쓸 수 있어요.` }
    case 'NO_TRACK':
      return { title: `이 영상에는 ${name} 자막이 없어요`, body: '자막이 있어야 한 줄씩 칠 수 있어요. 다른 영상을 고르거나 대본으로 연습해 보세요.' }
    case 'EMBED_BLOCKED':
      return { title: '이 영상은 사이트에서 재생할 수 없어요', body: '영상 주인이 외부 재생을 막아 두었어요. 비슷한 영상을 고르거나 대본만으로 연습해요.' }
    case 'NOT_CONNECTED':
    case 'NOT_CONFIGURED':
      return { title: '유튜브 연결은 아직 준비 중이에요', body: '검색과 자막을 가져오는 서버를 연결하고 있어요. 지금은 기본 연습과 대본으로 연습할 수 있고, 저장한 영상과 전에 연 영상은 볼 수 있어요.' }
    case 'OFFLINE':
      return { title: '인터넷 연결을 확인해 주세요', body: '이미 저장한 연습은 인터넷 없이도 칠 수 있어요.' }
    default:
      return { title: '잠시 문제가 생겼어요', body: '조금 뒤 다시 해 보세요. 그동안 기본 연습과 대본은 그대로 쓸 수 있어요.' }
  }
}
