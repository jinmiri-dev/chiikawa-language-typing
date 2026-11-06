import { expect, test } from 'vitest'
import { choices, dueWords, nextState, quizWords, sameWord } from './quiz'
import type { Word } from './types'

const w = (id: string, text: string, meaning?: string, savedAt = 0, wholeLine = false): Word => ({
  id,
  lang: 'ja',
  text,
  ...(meaning ? { meaning } : {}),
  from: { materialId: 'm', lineId: 'l' },
  savedAt,
  ...(wholeLine ? { wholeLine } : {}),
})

test('뜻이 있는 낱말만, 줄 전체는 빼고', () => {
  expect(quizWords([w('a', '話', '이야기'), w('b', '何'), w('c', '何の話？', '무슨 얘기', 0, true)]).map((x) => x.id)).toEqual(['a'])
})

test('오늘 볼 단어: 새 단어·때가 된 단어만, 외운 단어는 빼고', () => {
  const words = [w('a', '話', '이야기', 1), w('b', '雨', '비', 2), w('c', '山', '산', 3)]
  const states = { b: { step: 1, due: 5000 }, c: { step: 3, due: 0 } }
  expect(dueWords(words, states, 1000).map((x) => x.id)).toEqual(['a'])
  expect(dueWords(words, states, 6000).map((x) => x.id)).toEqual(['a', 'b'])
})

test('맞히면 1·3·7일 뒤, 틀리면 내일', () => {
  const DAY = 86_400_000
  expect(nextState(undefined, true, 0)).toEqual({ step: 1, due: DAY })
  expect(nextState({ step: 1, due: 0 }, true, 0)).toEqual({ step: 2, due: 3 * DAY })
  expect(nextState({ step: 2, due: 0 }, true, 0)).toEqual({ step: 3, due: 7 * DAY })
  expect(nextState({ step: 2, due: 0 }, false, 0)).toEqual({ step: 0, due: DAY })
})

test('보기 4개: 정답 하나와 겹치지 않는 오답 셋', () => {
  const pool = [w('a', '話', '이야기'), w('b', '雨', '비'), w('c', '山', '산')]
  const c = choices(pool[0], pool, () => 0.3)
  expect(c).toHaveLength(4)
  expect(c).toContain('이야기')
  expect(new Set(c).size).toBe(4)
})

test('직접 쳐 보기는 전각·대소문자·끝 문장부호를 보지 않는다', () => {
  expect(sameWord('ｈｅｌｌｏ', 'Hello')).toBe(true)
  expect(sameWord('話 ', '話')).toBe(true)
  expect(sameWord('話す', '話')).toBe(false)
})
