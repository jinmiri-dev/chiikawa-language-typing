import { expect, test } from 'vitest'
import { avgLineMs, compareText } from './compare'

test('빨라졌으면 얼마나', () => expect(compareText(8400, 7200)).toBe('지난번보다 한 줄에 1.2초 빨라졌어요 · 8.4초 → 7.2초'))
test('느려졌으면 숫자 대신 격려', () => expect(compareText(7000, 7200)).toBe('오늘은 꼼꼼하게 쳤어요'))
test('같아도 격려', () => expect(compareText(7200, 7200)).toBe('오늘은 꼼꼼하게 쳤어요'))
test('첫 기록', () => expect(compareText(null, 7200)).toBe('첫 기록이에요'))
test('평균', () => {
  expect(avgLineMs([])).toBe(0)
  expect(avgLineMs([{ lineId: 'a', firstTryAccuracy: 1, ms: 1000, mistakes: 0, at: 0 }, { lineId: 'b', firstTryAccuracy: 1, ms: 3000, mistakes: 0, at: 0 }])).toBe(2000)
})
