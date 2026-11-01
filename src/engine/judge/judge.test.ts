import { describe, expect, test } from 'vitest'
import { judge, normalizeLoose, readingProgress } from './judge'
import { explainMistake } from './explain'

const loose = { strict: false }

describe('판정', () => {
  test('너그러운 판정은 문장부호를 채워 준다', () => expect(judge('今日は、', '今日は', loose).done).toBe(true))
  test('엄격하면 문장부호도 친다', () => expect(judge('今日は、', '今日は', { strict: true }).done).toBe(false))
  test('틀린 위치', () => expect(judge('たべる', 'たへ', loose)).toEqual({ okUpTo: 1, wrongAt: 1, done: false }))
  test('전각·대소문자 무시', () => expect(judge('ＡＢ', 'ab', loose).done).toBe(true))
  test('덜 쳤으면 틀림 없음', () => expect(judge('たべる', 'たべ', loose)).toEqual({ okUpTo: 2, done: false }))
  test('다 치면 끝', () => expect(judge('ご飯もう食べた？', 'ご飯もう食べた', loose)).toEqual({ okUpTo: 8, done: true }))
  test('더 치면 틀림', () => expect(judge('たべ', 'たべる', loose)).toMatchObject({ wrongAt: 2, done: false }))
  test('곧은·굽은 따옴표', () => expect(normalizeLoose('“a”')).toBe(normalizeLoose('"a"')))
})

describe('틀린 이유', () => {
  test('탁음', () => expect(explainMistake('ja', 'たべ', 'たへ')).toBe('゛가 빠졌어요'))
  test('반탁음', () => expect(explainMistake('ja', 'ぱ', 'は')).toBe('゜가 빠졌어요'))
  test('작은 글자', () => expect(explainMistake('ja', 'ちょっと', 'ちょつと')).toBe('작은 っ이에요'))
  test('장음', () => expect(explainMistake('ja', 'コーヒー', 'コヒー')).toBe('ー(장음)가 빠졌어요'))
  test('다른 한자', () => expect(explainMistake('ja', '書く', '描く')).toBe('다른 한자를 골랐어요: 書く → 描く'))
  test('그 밖', () => expect(explainMistake('ja', 'たべ', 'ため')).toBe('べ 대신 め를 쳤어요'))
  test('같으면 없음', () => expect(explainMistake('ja', 'たべ', 'たべ')).toBeNull())
})

describe('조합 중 읽기', () => {
  test('가나 조합', () => expect(readingProgress('たべる', 'たべ')).toEqual({ matches: true, at: 2 }))
  test('가나 조합 틀림', () => expect(readingProgress('たべる', 'たへ')).toEqual({ matches: false, at: 1 }))
  test('로마자 조합', () => expect(readingProgress('たべる', 'tab')).toEqual({ matches: true, at: 3 }))
  test('가나와 로마자가 섞인 조합', () => expect(readingProgress('たべる', 'たb')).toEqual({ matches: true, at: 3 }))
})
