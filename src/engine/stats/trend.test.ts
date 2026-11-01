import { expect, test } from 'vitest'
import { dayKey, lineSpeedTrend } from './trend'
import type { StatRecord } from '../types'

const DAY = 86_400_000
const now = Date.UTC(2026, 10, 30, 12)
const rec = (daysAgo: number, avgMs: number, lang: StatRecord['lang'] = 'ja'): StatRecord => ({
  id: `r${daysAgo}-${avgMs}`, lang, day: dayKey(now - daysAgo * DAY), avgMs, accuracy: 0.9,
})

test('기록 3개 미만이면 보이지 않는다', () => expect(lineSpeedTrend([rec(20, 9000), rec(1, 6000)], 'ja', now)).toBeNull())
test('2주 전 기록이 있으면 그것과 최근 3번 평균을 비교', () =>
  expect(lineSpeedTrend([rec(20, 9100), rec(16, 9000), rec(3, 6000), rec(2, 6000), rec(1, 6000)], 'ja', now)?.text).toBe('일본어 · 2주 전보다 한 줄 3.1초 빨라졌어요'))
test('2주가 안 됐으면 처음과 비교', () =>
  expect(lineSpeedTrend([rec(5, 8000), rec(3, 7000), rec(1, 6000)], 'ja', now)?.text).toBe('일본어 · 처음보다 한 줄 1.5초 빨라졌어요'))
test('느려졌으면 보이지 않는다(자랑할 때만)', () => expect(lineSpeedTrend([rec(5, 6000), rec(3, 7000), rec(1, 8000)], 'ja', now)).toBeNull())
test('다른 언어 기록은 섞지 않는다', () => expect(lineSpeedTrend([rec(5, 9000, 'mn'), rec(3, 7000), rec(1, 6000)], 'ja', now)).toBeNull())
test('날짜 키', () => expect(dayKey(Date.UTC(2026, 0, 5, 12))).toBe('2026-01-05'))
