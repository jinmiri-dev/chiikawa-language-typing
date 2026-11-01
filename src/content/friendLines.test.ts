import { expect, test } from 'vitest'
import { FRIEND_INFO, FRIEND_LINES, pickLine, SITUATIONS, STAGE_LINES } from './friendLines'
import { FRIENDS } from '../engine/types'

const MAX: Record<string, number> = { chiikawa: 8, usagi: 8, kurimanju: 14 }
const EMOJI = /\p{Extended_Pictographic}/u

test('8명 × 11상황, 상황마다 문구 2개 이상', () => {
  for (const f of FRIENDS) for (const s of SITUATIONS) expect(FRIEND_LINES[f][s].length, `${f} ${s}`).toBeGreaterThanOrEqual(2)
})

test('5분 단계는 8명 × 13칸', () => {
  for (const f of FRIENDS) expect(STAGE_LINES[f]).toHaveLength(13)
})

test('말풍선 길이와 이모지', () => {
  for (const f of FRIENDS) {
    const max = MAX[f] ?? 24
    const all = [...SITUATIONS.flatMap((s) => FRIEND_LINES[f][s].map((l) => l.text)), ...STAGE_LINES[f].map((l) => l.line)]
    for (const text of all) {
      expect([...text].length, `${f}: ${text}`).toBeLessThanOrEqual(max)
      expect(EMOJI.test(text), text).toBe(false)
    }
  }
})

test('소개와 이름', () => {
  expect(FRIEND_INFO.chiikawa.name).toBe('치이카와')
  for (const f of FRIENDS) expect(FRIEND_INFO[f].intro).toBeTruthy()
})

test('직전 문구는 다시 고르지 않는다', () => {
  const [a, b] = FRIEND_LINES.hachiware.hello
  for (let i = 0; i < 20; i++) expect(pickLine('hachiware', 'hello', a.text, () => i / 20).text).toBe(b.text)
})
