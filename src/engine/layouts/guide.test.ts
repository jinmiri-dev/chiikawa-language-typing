import { expect, test } from 'vitest'
import { getLayout } from './index'
import { guideFor, guideText } from './guide'
import type { Segment } from '../types'

const seg = (text: string, reading = text): Segment => ({ text, reading, isWord: true, confident: true })
const pc = getLayout('ja-pc-romaji')
const flick = getLayout('ja-flick')
const tap = getLayout('ja-tap')

test('아직 안 쳤으면 첫 키', () => expect(guideFor(pc, seg('食べ', 'たべ'), '')).toMatchObject({ nextIndex: 0, matches: true }))
test('PC 로마자: 조합 중 로마자 위치', () => expect(guideFor(pc, seg('食べ', 'たべ'), 'たb')).toMatchObject({ nextIndex: 3, matches: true }))
test('PC 로마자: 다 쳤으면 변환 키', () => {
  const g = guideFor(pc, seg('食べ', 'たべ'), 'たべ')
  expect(g.steps[g.nextIndex].keyId).toBe('space')
})
test('플릭: 탁음 전 글자까지 쳤으면 꾸밈 키', () => {
  const g = guideFor(flick, seg('たべ'), 'たへ')
  expect(g.matches).toBe(true)
  expect(g.steps[g.nextIndex]).toMatchObject({ keyId: 'mod', taps: 1 })
})
test('플릭: 다른 글자면 틀림', () => expect(guideFor(flick, seg('たべ'), 'ため').matches).toBe(false))
test('플릭: 요음 중간', () => {
  const g = guideFor(flick, seg('きょう'), 'きよ')
  expect(g.steps[g.nextIndex].keyId).toBe('mod')
})

test('한 줄 안내 문구', () => {
  expect(guideText(pc, seg('食べ', 'たべ'))).toBe('食べ → たべ → T A B E → Space로 변환, Enter로 확정')
  expect(guideText(flick, seg('食べ', 'たべ'))).toBe('食べ → たべ → た(た행 탭) べ(は행 → + ゛) → 후보에서 食べ 선택')
  expect(guideText(tap, seg('うん'))).toBe('うん → う(あ행 3번) ん(わ행 3번)')
})

test('괄호가 있는 대본 줄도 안내가 멈추지 않는다', () => {
  expect(guideText(pc, seg('「はい」'))).toBe('「はい」 → [ H A I ]')
  expect(() => guideText(flick, seg('「はい」'))).not.toThrow()
  expect(guideFor(pc, seg('「はい」'), 'は').matches).toBe(false)
})
