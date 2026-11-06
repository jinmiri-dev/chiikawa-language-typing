import { describe, expect, test } from 'vitest'
import { CHECK_CHAR, keyboardTrouble, layoutFromComposition, recommendLayout } from './detect'

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

describe('연습 중 자동 인식', () => {
  test('대만어: 주음 기호면 주음, 로마자면 병음', () => {
    expect(layoutFromComposition('tw', 'pc', 'ㄋ')).toBe('tw-zhuyin-pc')
    expect(layoutFromComposition('tw', 'pc', 'ni')).toBe('tw-pinyin')
    expect(layoutFromComposition('tw', 'mobile', 'ㄋㄧ')).toBe('tw-zhuyin-mobile')
  })
  test('중국어 휴대폰: 숫자면 9키', () => expect(layoutFromComposition('zh', 'mobile', '64')).toBe('zh-pinyin-9key'))
  test('일본어 휴대폰: 로마자면 로마자, 가나 한 글자면 플릭', () => {
    expect(layoutFromComposition('ja', 'mobile', 'k')).toBe('ja-mobile-romaji')
    expect(layoutFromComposition('ja', 'mobile', 'か')).toBe('ja-flick')
    expect(layoutFromComposition('ja', 'pc', 'かな')).toBeNull()
  })
  test('키보드 문제 찾기', () => {
    expect(keyboardTrouble('ja', { key: 'Process', composing: 'ㅎ' })).toBe('korean-ime')
    expect(keyboardTrouble('en', { key: 'ㅗ' })).toBe('korean-ime')
    expect(keyboardTrouble('mn', { key: 's', code: 'KeyS' }, 'с')).toBe('mn-latin')
    expect(keyboardTrouble('mn', { key: 'к', code: 'KeyR' }, 'ж')).toBe('mn-russian')
    expect(keyboardTrouble('mn', { key: 'ж', code: 'KeyR' }, 'ж')).toBeNull()
    expect(keyboardTrouble('zh', { key: 'n', code: 'KeyN' }, '你')).toBe('ime-off')
    expect(keyboardTrouble('en', { key: 'h', code: 'KeyH' }, 'H')).toBeNull()
  })
})
