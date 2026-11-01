import { expect, test } from 'vitest'
import { mergeUp, removeLines, restoreRemoved, shiftKo, splitAt, type Segmenter } from './edit'
import type { Line } from '../types'

const seg: Segmenter = (src) => [{ text: src, reading: src, isWord: true, confident: true }]
const L = (src: string, ko?: string, extra: Partial<Line> = {}): Line => ({ id: 'x', src, ...(ko ? { ko } : {}), segments: seg(src), ...extra })
const view = (lines: Line[]) => lines.map((l) => [l.id, l.src, l.ko ?? ''])

test('위 줄과 합치기: 원문은 붙이고 뜻은 띄워서, 시간은 앞 시작~뒤 끝', () => {
  const r = mergeUp([L('おは', '좋은', { start: 1, end: 2 }), L('よう', '아침', { start: 2, end: 3 }), L('またね', '또 봐')], 1, seg)
  expect(view(r)).toEqual([['l001', 'おはよう', '좋은 아침'], ['l002', 'またね', '또 봐']])
  expect([r[0].start, r[0].end]).toEqual([1, 3])
  expect(r[0].segments[0].text).toBe('おはよう')
})
test('첫 줄은 합칠 위 줄이 없다', () => expect(mergeUp([L('あ')], 0, seg)).toHaveLength(1))

test('둘로 나누기: 뜻은 앞 줄에, 뒤 줄은 뜻 확인 필요', () => {
  const r = splitAt([L('いいね！行こう。', '좋아! 가자.')], 0, 4, seg)
  expect(view(r)).toEqual([['l001', 'いいね！', '좋아! 가자.'], ['l002', '行こう。', '']])
  expect(r[1].needsCheck).toEqual(['ko'])
})

test('뜻 위로: 아래 뜻을 한 칸씩 당기고 마지막은 빈다, 줄 수 유지', () =>
  expect(view(shiftKo([L('a', '1'), L('b', '2'), L('c', '3')], 0, -1))).toEqual([['l001', 'a', '2'], ['l002', 'b', '3'], ['l003', 'c', '']]))
test('뜻 아래로: 고른 줄부터 한 칸 밀고 고른 줄은 빈다', () =>
  expect(view(shiftKo([L('a', '1'), L('b', '2'), L('c')], 1, 1))).toEqual([['l001', 'a', '1'], ['l002', 'b', ''], ['l003', 'c', '2']]))
test('뜻 아래로 밀면 마지막 뜻이 사라질 때는 하지 않는다', () => {
  const lines = [L('a', '1'), L('b', '2')]
  expect(shiftKo(lines, 0, 1)).toBe(lines)
})

test('삭제', () => expect(view(removeLines([L('a'), L('b'), L('c')], [0, 2]))).toEqual([['l001', 'b', '']]))

test('지운 소리 표시 되살리기', () => {
  const r = restoreRemoved(L('もういいよ。', '이제 됐어.', { removed: ['[ため息]', '(拍手)'] }), '[ため息]', seg)
  expect(r.src).toBe('[ため息] もういいよ。')
  expect(r.removed).toEqual(['(拍手)'])
})

test('원래 배열은 바꾸지 않는다', () => {
  const lines = [L('a', '1'), L('b', '2')]
  mergeUp(lines, 1, seg)
  expect(lines.map((l) => l.src)).toEqual(['a', 'b'])
})
