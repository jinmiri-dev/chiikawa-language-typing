import { expect, test } from 'vitest'
import { recommendLayout } from './detect'

const sample = (compositionSamples: string[], finalValue = '', keydownKeys: string[] = []) => ({ compositionSamples, keydownKeys, finalValue })

test('가나가 바로 오면 12키 플릭', () => expect(recommendLayout('ja', sample(['か']))).toBe('ja-flick'))
test('로마자가 먼저 오면 휴대폰 로마자', () => expect(recommendLayout('ja', sample(['k', 'か']))).toBe('ja-mobile-romaji'))
test('조합 없이 가나가 확정되면 12키', () => expect(recommendLayout('ja', sample([], 'か'))).toBe('ja-flick'))
test('모르면 추천하지 않는다', () => {
  expect(recommendLayout('ja', sample([]))).toBeNull()
  expect(recommendLayout('ja', sample([], 'ka'))).toBeNull()
})
