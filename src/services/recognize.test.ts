import { expect, test } from 'vitest'
import { bestMatch, matchScore } from './recognize'

test('따라 말하기 점수: 문장부호·띄어쓰기·대소문자는 보지 않는다', () => {
  expect(matchScore('She sells seashells by the seashore.', 'she sells seashells by the seashore')).toBe(100)
  expect(matchScore('生麦生米生卵', '生麦 生米 生卵')).toBe(100)
  expect(matchScore('四是四，十是十', '四是四十是十')).toBe(100)
  expect(matchScore('Red lorry, yellow lorry.', 'red lorry yellow lolly')).toBeGreaterThan(80)
  expect(matchScore('Red lorry, yellow lorry.', 'hello')).toBeLessThan(30)
  expect(bestMatch('Red lorry', ['red lolly', 'red lorry'])).toEqual({ text: 'red lorry', score: 100 })
  expect(bestMatch('Red lorry', [])).toBeNull()
})
