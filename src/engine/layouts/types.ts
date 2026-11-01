import type { Lang } from '../lang'
import type { LayoutId } from '../types'

export type Gesture = 'tap' | 'left' | 'up' | 'right' | 'down'

/** 키보드 그림의 키 하나 */
export interface KeyDef {
  id: string
  label: string
  row: number
  col: number
  /** 너비 배수(기본 1) */
  w?: number
  /** 플릭 방향별 글자 */
  flick?: Partial<Record<Exclude<Gesture, 'tap'>, string>>
}

export interface Layout {
  id: LayoutId
  lang: Lang
  device: 'pc' | 'mobile'
  rows: KeyDef[][]
  /** 실제 기기에서 확인했는가. false면 안내를 숨긴다(기획안 15장). */
  verified: boolean
}

/** 눌러야 할 키 한 번 */
export interface KeyStep {
  keyId: string
  gesture?: Gesture
  /** 탭 반복 횟수 */
  taps?: number
  /** 이 단계 뒤 화면에 보이는 글자 */
  text: string
}
