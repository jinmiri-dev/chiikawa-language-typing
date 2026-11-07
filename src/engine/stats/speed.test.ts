import { expect, test } from 'vitest'
import { perMinute, sessionStats, speedLevel } from './speed'

test('분당 글자', () => {
  expect(perMinute(30, 10_000)).toBe(180)
  expect(perMinute(5, 0)).toBe(0)
})
test('끝낸 줄들의 평균 속도와 정확도', () => {
  const r = (lineId: string, ms: number, acc: number) => ({ lineId, ms, firstTryAccuracy: acc, mistakes: 0, at: 0 })
  expect(sessionStats([r('a', 10_000, 1), r('b', 20_000, 0.5)], { a: 30, b: 30 })).toEqual({ cpm: 120, accuracy: 75, lines: 2 })
  expect(sessionStats([], {})).toEqual({ cpm: 0, accuracy: 100, lines: 0 })
})
test('속도 단계', () => {
  expect(speedLevel(50)).toBe('start')
  expect(speedLevel(200)).toBe('fast')
})
