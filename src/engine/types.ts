/** 앱 전체가 함께 쓰는 데이터 모양 (프론트-설계 4장). */
export type { Lang } from './lang'
import type { Lang } from './lang'

/** 말투 문서 순서 */
export const FRIENDS = ['chiikawa', 'hachiware', 'usagi', 'momonga', 'kurimanju', 'shisa', 'rakko', 'kani'] as const
export type FriendId = (typeof FRIENDS)[number]

export type LayoutId =
  | 'en-qwerty'
  | 'ja-pc-romaji'
  | 'ja-flick'
  | 'ja-tap'
  | 'ja-mobile-romaji'
  | 'zh-pinyin'
  | 'zh-pinyin-9key'
  | 'tw-zhuyin-pc'
  | 'tw-zhuyin-mobile'
  | 'tw-pinyin'
  | 'mn-cyrillic'

export interface Segment {
  /** 원문 조각 (예: 食べ) */
  text: string
  /** ja: 히라가나, zh/tw: 성조 병음 */
  reading?: string
  zhuyin?: string
  romaji?: string
  /** 단어 시작 여부(담기·밑줄용) */
  isWord: boolean
  /** 읽기 확신. false면 안내를 숨기거나 "확인 필요" */
  confident: boolean
}

export interface Line {
  id: string
  /** 연습할 원문 */
  src: string
  ko?: string
  start?: number
  end?: number
  segments: Segment[]
  removed?: string[]
  needsCheck?: ('reading' | 'ko')[]
}

export interface Material {
  id: string
  lang: Lang
  kind: 'starter' | 'youtube' | 'script'
  title: string
  youtubeId?: string
  koSource: 'given' | 'youtube' | 'auto' | 'none'
  lines: Line[]
  createdAt: number
}

export interface LineResult {
  lineId: string
  firstTryAccuracy: number
  ms: number
  mistakes: number
  at: number
}

export interface Progress {
  materialId: string
  lineIndex: number
  results: LineResult[]
  activeMs: number
  friend: FriendId
  /** 이어서 공부하기 순서 */
  updatedAt: number
}

export interface Settings {
  device: 'auto' | 'pc' | 'mobile'
  layout: Partial<Record<Lang, LayoutId>>
  hintMode: 'full' | 'line' | 'off'
  hintFading: boolean
  show: { ko: boolean; reading: boolean; src: boolean }
  strict: boolean
  autoListen: boolean
  reduceMotion: boolean
  voice: Partial<Record<Lang, 'female' | 'male'>>
  rate: 1 | 0.75
  friend: FriendId
}

export const DEFAULT_SETTINGS: Settings = {
  device: 'auto',
  layout: {},
  hintMode: 'full',
  hintFading: true,
  show: { ko: true, reading: true, src: true },
  strict: false,
  autoListen: false,
  reduceMotion: false,
  voice: {},
  rate: 1,
  friend: 'chiikawa',
}
