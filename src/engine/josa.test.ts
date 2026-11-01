import { expect, test } from 'vitest'
import { eul, ro } from './josa'

test('을/를', () => {
  expect(eul('인사와 대답')).toBe('을')
  expect(eul('약속 잡기')).toBe('를')
  expect(eul('리액션')).toBe('을')
})
test('으로/로 (ㄹ 받침은 로)', () => {
  expect(ro('12키 플릭')).toBe('으로')
  expect(ro('휴대폰 로마자')).toBe('로')
  expect(ro('PC 로마자 입력')).toBe('으로')
  expect(ro('하치와레')).toBe('로')
  expect(ro('카니')).toBe('로')
})
