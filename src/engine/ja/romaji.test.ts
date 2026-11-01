import { expect, test } from 'vitest'
import { kanaUnits, romajiKeys, romajiOf } from './romaji'
import { starterMaterial } from '../../content/starter'

const keys = (s: string) => romajiKeys(s).join(' ')

test('기본', () => expect(keys('たべる')).toBe('t a b e r u'))
test('요음', () => expect(keys('きょう')).toBe('k y o u'))
test('작은 っ 은 다음 자음 두 번', () => expect(keys('ちょっと')).toBe('c h o t t o'))
test('っ 뒤 ち 는 cchi', () => expect(keys('まっちゃ')).toBe('m a c c h a'))
test('ん 은 nn', () => expect(keys('しんぶん')).toBe('s h i n n b u n n'))
test('가타카나와 장음', () => expect(keys('コーヒー')).toBe('k o - h i -'))
test('단독 작은 글자', () => expect(keys('ぁ')).toBe('x a'))
test('문장부호', () => expect(keys('うん、そう。')).toBe('u n n , s o u .'))
test('헵번식', () => {
  expect(romajiOf('し')).toBe('shi')
  expect(romajiOf('つ')).toBe('tsu')
  expect(romajiOf('ふ')).toBe('fu')
  expect(romajiOf('じ')).toBe('ji')
  expect(romajiOf('を')).toBe('wo')
  expect(romajiOf('ふぇ')).toBe('fe')
})
test('단위 나누기', () => expect(kanaUnits('しゅっぱつ')).toEqual(['しゅ', 'っ', 'ぱ', 'つ']))
test('모르는 문자는 예외', () => expect(() => romajiKeys('漢')).toThrow())
test('기본 연습 40줄 읽기가 모두 로마자로 바뀐다', () => {
  for (const id of ['ja-greet', 'ja-plan', 'ja-react', 'ja-bye'])
    for (const line of starterMaterial(id)!.lines)
      for (const g of line.segments) expect(() => romajiKeys(g.reading!), g.reading).not.toThrow()
})
