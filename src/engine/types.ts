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
  | 'en-qwerty-mobile'
  | 'zh-pinyin-mobile'
  | 'tw-pinyin-mobile'
  | 'mn-cyrillic-mobile'

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
  /** 유튜브 원문이 어디서 왔나(가사 저장소면 영상과 시간이 조금 어긋날 수 있다) */
  source?: 'manual' | 'asr' | 'lyrics'
  /** 영상과 줄 시간 맞추기(초). 줄 시간에 더한다 */
  timeOffset?: number
  /** 뉴스: 원문 기사 주소와 언론사 */
  link?: string
  sourceName?: string
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
  /** 같은 재료를 다시 칠 때, 지난 회차의 한 줄 평균 시간(완료 화면 비교용) */
  prevAvgMs?: number
}

export interface Settings {
  device: 'auto' | 'pc' | 'mobile'
  layout: Partial<Record<Lang, LayoutId>>
  hintMode: 'full' | 'line' | 'off'
  hintFading: boolean
  /** pairs: 치는 낱말과 그 한국어 뜻을 함께 표시(없던 예전 설정은 켜짐으로 본다) */
  show: { ko: boolean; reading: boolean; src: boolean; pairs?: boolean }
  /** 쉽게 채점: 띄어쓰기·문장부호를 건너뛰고 대소문자도 보지 않는다(기본은 끔: 다 친다) */
  easyGrading: boolean
  autoListen: boolean
  /** 줄을 다 치면 그 줄을 한 번 더 듣기 */
  listenAfter: boolean
  /** 단어를 다 칠 때마다 그 단어 읽기 */
  speakWords: boolean
  /** 효과음(맞게 친 글자·틀림·줄 끝). 없던 예전 설정은 켜짐으로 본다 */
  sfx?: boolean
  /** 다 들으면 Enter 없이 다음 줄로(기본 끔: 다 치면 Enter 를 눌러 넘어간다. 그 사이 Esc 로 다시 듣기) */
  autoAdvance: boolean
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
  show: { ko: true, reading: true, src: true, pairs: true },
  easyGrading: false,
  autoListen: false,
  listenAfter: true,
  speakWords: true,
  sfx: true,
  autoAdvance: false,
  reduceMotion: false,
  voice: {},
  rate: 1,
  friend: 'chiikawa',
}

export interface Word {
  id: string
  lang: Lang
  text: string
  reading?: string
  meaning?: string
  from: { materialId: string; lineId: string }
  /** 담은 줄 전체이면 true */
  wholeLine?: boolean
  savedAt?: number
  /** 나온 줄(예문). 단어장과 "담은 줄만 다시 연습"이 쓴다 */
  example?: { src: string; ko?: string; segments: Segment[] }
}

/** 오늘의 복습 항목. step 0:1일 1:3일 2:7일 3:졸업 */
export interface ReviewItem {
  id: string
  ref: { materialId: string; lineId: string }
  due: number
  step: 0 | 1 | 2 | 3
}

/** 효과 기록: 기본 연습 세트 하나를 끝낼 때마다 */
export interface StatRecord {
  id: string
  lang: Lang
  day: string
  avgMs: number
  accuracy: number
}

/** 저장한 유튜브 영상(검색 한도를 쓰지 않으려고 제목·썸네일·길이를 함께 둔다) */
export interface SavedVideo {
  /** `<lang>:<videoId>` */
  id: string
  lang: Lang
  videoId: string
  title: string
  channel: string
  thumbnail: string
  durationSec: number
  savedAt: number
}
