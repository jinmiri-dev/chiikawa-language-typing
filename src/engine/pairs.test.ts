import { expect, test } from 'vitest'
import { currentPair, koRange, placePairs } from './pairs'

test('낱말 짝을 줄 안의 자리로', () => {
  const p = placePairs('何の話？', [['何', '무슨'], ['話', '얘기']])
  expect(p.map((x) => [x.src, x.start, x.end])).toEqual([['何', 0, 1], ['話', 2, 3]])
  expect(currentPair(p, 1)?.src).toBe('話')
  expect(currentPair(p, 0)?.src).toBe('何')
  expect(currentPair(p, 3)).toBeNull()
})
test('같은 낱말이 두 번이면 차례대로', () => {
  const p = placePairs('I like you and you like me.', [['like', '좋아하다'], ['you', '너'], ['you', '너'], ['like', '좋아하다']])
  expect(p.map((x) => x.start)).toEqual([2, 7, 15, 19])
})
test('한국어 뜻 속 자리', () => {
  expect(koRange('무슨 얘기 중이야?', '얘기')).toEqual([3, 5])
  expect(koRange('무슨 얘기 중이야?', '이야기')).toBeNull()
})
