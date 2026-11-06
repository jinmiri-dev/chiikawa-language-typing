/**
 * 유튜브 추천 영상. 목록 자체는 youtubePicksData.ts(중계 서버에서 실제로 열리는 걸 확인하고 자막·뜻을 미리 받아 둔 것만).
 * 유튜브 탭을 열면 검색 전에 종류별로 먼저 보인다. 검색 한도를 쓰지 않는다.
 */
import { LANGS, type Lang } from '../engine/lang'
import { PICKS } from './youtubePicksData'

export const PICK_KINDS = ['kids', 'song', 'quote', 'news', 'movie', 'vlog'] as const
export type PickKind = (typeof PICK_KINDS)[number]
export const PICK_KIND_NAME: Record<PickKind, string> = {
  kids: '동요·동화',
  song: '노래',
  quote: '명언·이야기',
  news: '뉴스',
  movie: '영화·방송',
  vlog: '일상',
}

export interface VideoPick {
  videoId: string
  title: string
  channel: string
  durationSec: number
  kind: PickKind
  /** 원문이 어디서 오나: 영상 자막, 또는 공개 가사 저장소의 시간 가사 */
  src?: 'captions' | 'lyrics'
}

/** 언어마다 실제로 열리는 걸 확인한 영상. 종류 순서대로 보이고, 같은 영상은 한 번만 */
export const YOUTUBE_PICKS: Record<Lang, VideoPick[]> = Object.fromEntries(
  LANGS.map((l) => {
    const all = PICKS[l]
    const unique = all.filter((v, i) => all.findIndex((x) => x.videoId === v.videoId) === i)
    return [l, PICK_KINDS.flatMap((k) => unique.filter((v) => v.kind === k))]
  }),
) as Record<Lang, VideoPick[]>

export const pickThumb = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
