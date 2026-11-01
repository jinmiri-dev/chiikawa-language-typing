import { expect, test } from 'vitest'
import { flickSteps, tapSteps } from './kana12'
import { kanaUnits } from './romaji'
import { starterMaterial } from '../../content/starter'

test('플릭 탁음', () =>
  expect(flickSteps('べ')).toEqual([
    { keyId: 'ha', gesture: 'right', text: 'へ' },
    { keyId: 'mod', gesture: 'tap', taps: 1, text: 'べ' },
  ]))
test('플릭 반탁음은 꾸밈 키 2번', () => expect(flickSteps('ぱ')[1]).toMatchObject({ keyId: 'mod', taps: 2, text: 'ぱ' }))
test('플릭 작은 っ', () =>
  expect(flickSteps('っ')).toEqual([
    { keyId: 'ta', gesture: 'up', text: 'つ' },
    { keyId: 'mod', gesture: 'tap', taps: 1, text: 'っ' },
  ]))
test('플릭 ん 과 ー', () => {
  expect(flickSteps('ん')).toEqual([{ keyId: 'wa', gesture: 'up', text: 'ん' }])
  expect(flickSteps('ー')).toEqual([{ keyId: 'wa', gesture: 'right', text: 'ー' }])
})
test('플릭 や행', () => {
  expect(flickSteps('ゆ')).toEqual([{ keyId: 'ya', gesture: 'up', text: 'ゆ' }])
  expect(flickSteps('よ')).toEqual([{ keyId: 'ya', gesture: 'down', text: 'よ' }])
})
test('플릭 요음은 세 단계', () => {
  const s = flickSteps('きょ')
  expect(s).toHaveLength(3)
  expect(s.map((x) => x.text)).toEqual(['き', 'よ', 'ょ'])
})
test('플릭 문장부호', () => expect(flickSteps('？')).toEqual([{ keyId: 'punct', gesture: 'up', text: '？' }]))
test('탭 반복', () => expect(tapSteps('う')).toEqual([{ keyId: 'a', gesture: 'tap', taps: 3, text: 'う' }]))
test('탭 탁음', () =>
  expect(tapSteps('ご')).toEqual([
    { keyId: 'ka', gesture: 'tap', taps: 5, text: 'こ' },
    { keyId: 'mod', gesture: 'tap', taps: 1, text: 'ご' },
  ]))
test('가타카나도 같은 키', () => expect(flickSteps('カ')).toEqual(flickSteps('か')))
test('기본 연습 40줄 읽기가 모두 플릭·탭으로 바뀐다', () => {
  for (const id of ['ja-greet', 'ja-plan', 'ja-react', 'ja-bye'])
    for (const line of starterMaterial(id)!.lines)
      for (const g of line.segments)
        for (const u of kanaUnits(g.reading!)) {
          expect(flickSteps(u).length, u).toBeGreaterThan(0)
          expect(tapSteps(u).length, u).toBeGreaterThan(0)
        }
})
