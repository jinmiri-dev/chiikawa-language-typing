import { expect, test } from 'vitest'
import { CHECK_CHAR, recommendLayout } from './detect'

const sample = (compositionSamples: string[], finalValue = '', keydownKeys: string[] = []) => ({ compositionSamples, keydownKeys, finalValue })

test('가나가 바로 오면 12키 플릭', () => expect(recommendLayout('ja', sample(['か']))).toBe('ja-flick'))
test('로마자가 먼저 오면 휴대폰 로마자', () => expect(recommendLayout('ja', sample(['k', 'か']))).toBe('ja-mobile-romaji'))
test('조합 없이 가나가 확정되면 12키', () => expect(recommendLayout('ja', sample([], 'か'))).toBe('ja-flick'))
test('모르면 추천하지 않는다', () => {
  expect(recommendLayout('ja', sample([]))).toBeNull()
  expect(recommendLayout('ja', sample([], 'ka'))).toBeNull()
})

test('대만: 주음이 오면 휴대폰 주음, 로마자면 휴대폰 병음', () => {
  expect(recommendLayout('tw', sample(['ㄋ']))).toBe('tw-zhuyin-mobile')
  expect(recommendLayout('tw', sample(['n']))).toBe('tw-pinyin-mobile')
})
test('중국: 숫자가 오면 9키, 로마자면 쿼티', () => {
  expect(recommendLayout('zh', sample(['6']))).toBe('zh-pinyin-9key')
  expect(recommendLayout('zh', sample(['n']))).toBe('zh-pinyin-mobile')
})
test('영어·몽골어는 확인 없이 고른다', () => {
  expect(recommendLayout('en', sample(['h']))).toBeNull()
  expect(recommendLayout('mn', sample([], 'с'))).toBeNull()
})
test('확인할 글자', () => {
  expect(CHECK_CHAR.ja).toBe('か')
  expect(CHECK_CHAR.tw).toBe('你')
  expect(CHECK_CHAR.en).toBeUndefined()
})
