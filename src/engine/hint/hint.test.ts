import { expect, test } from 'vitest'
import { nextHintLevel, type HintMemory } from './hint'

const run = (mem: HintMemory, unit: string, results: boolean[], idle = 0) => {
  let m = mem
  let level = 'full'
  for (const r of results) ({ mem: m, level } = nextHintLevel(m, unit, r, idle))
  return { mem: m, level }
}

test('처음은 전체 안내', () => expect(nextHintLevel({}, 'べ', false, 0).level).toBe('full'))
test('3번 연속 맞으면 한 줄, 3번 더면 없음', () => {
  expect(run({}, 'べ', [true, true]).level).toBe('full')
  expect(run({}, 'べ', [true, true, true]).level).toBe('line')
  expect(run({}, 'べ', [true, true, true, true, true, true]).level).toBe('off')
})
test('틀리면 전체로', () => {
  const { mem } = run({}, 'べ', Array(6).fill(true))
  expect(nextHintLevel(mem, 'べ', false, 0).level).toBe('full')
})
test('2초 멈추면 전체로', () => {
  const { mem } = run({}, 'べ', Array(6).fill(true))
  expect(nextHintLevel(mem, 'べ', true, 2000).level).toBe('full')
})
test('다른 글자는 영향 없음', () => {
  const { mem } = run({}, 'べ', Array(6).fill(true))
  expect(nextHintLevel(mem, 'た', true, 0).level).toBe('full')
  expect(mem['べ'].level).toBe('off')
})
test('입력 기억을 바꾸지 않는다', () => {
  const mem: HintMemory = {}
  nextHintLevel(mem, 'べ', true, 0)
  expect(mem).toEqual({})
})
