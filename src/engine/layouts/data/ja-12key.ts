import { KANA_KEYS } from '../../ja/kana12'
import type { KeyDef, Layout } from '../types'

const KANA = Object.fromEntries(KANA_KEYS)

function kanaKey(id: string, row: number, col: number): KeyDef {
  const [tap, left, up, right, down] = KANA[id]
  // や행 키는 ゆ ↑, よ ↓
  const flick = id === 'ya' ? { up: left, down: up } : { left, up, right, down }
  return { id, label: tap, row, col, flick: Object.fromEntries(Object.entries(flick).filter(([, v]) => v)) }
}
const fn = (id: string, label: string, row: number, col: number, w?: number): KeyDef => ({ id, label, row, col, ...(w ? { w } : {}) })

/** 휴대폰 12키(iPhone·Android 공통 모양). 가운데 3열이 가나 키다. */
const rows: KeyDef[][] = [
  [fn('next', '→', 0, 0), kanaKey('a', 0, 1), kanaKey('ka', 0, 2), kanaKey('sa', 0, 3), fn('del', '⌫', 0, 4)],
  [fn('undo', '↺', 1, 0), kanaKey('ta', 1, 1), kanaKey('na', 1, 2), kanaKey('ha', 1, 3), fn('space', '공백', 1, 4)],
  [fn('abc', 'ABC', 2, 0), kanaKey('ma', 2, 1), kanaKey('ya', 2, 2), kanaKey('ra', 2, 3), fn('enter', '확정', 2, 4)],
  [fn('globe', '🌐', 3, 0), fn('mod', '゛゜小', 3, 1), kanaKey('wa', 3, 2), kanaKey('punct', 3, 3)],
]

/** 실제 기기 검증(기획안 15장) 전이라 verified: false */
export const jaFlick: Layout = { id: 'ja-flick', lang: 'ja', device: 'mobile', verified: false, rows }
export const jaTap: Layout = { id: 'ja-tap', lang: 'ja', device: 'mobile', verified: false, rows }
