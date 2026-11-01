import { expect, test } from 'vitest'
import { clockEvent, stageOf, type ClockState } from './clock'

const start: ClockState = { activeMs: 0, lastAt: null }
const run = (events: [number, Parameters<typeof clockEvent>[2]][]) =>
  events.reduce((s, [now, kind]) => clockEvent(s, now, kind), start)

test('입력 사이 시간을 더한다', () => expect(run([[0, 'input'], [1000, 'input'], [3000, 'input']]).activeMs).toBe(3000))
test('60초 넘게 쉬면 그 사이는 빼고', () => expect(run([[0, 'input'], [61_000, 'input'], [62_000, 'input']]).activeMs).toBe(1000))
test('숨긴 동안은 빼고', () =>
  expect(run([[0, 'input'], [1000, 'input'], [2000, 'hide'], [602_000, 'show'], [603_000, 'input']]).activeMs).toBe(2000))
test('tick 은 입력처럼 시간을 잰다', () => expect(run([[0, 'input'], [30_000, 'tick']]).activeMs).toBe(30_000))
test('5분 단계', () => {
  expect(stageOf(299_999)).toBe(0)
  expect(stageOf(300_000)).toBe(1)
  expect(stageOf(3_600_000)).toBe(12)
  expect(stageOf(9_999_999)).toBe(12)
})
