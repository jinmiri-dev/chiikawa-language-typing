import { expect, test } from 'vitest'
import { compositionLabel, summarizeLog } from './inputLog'

test('영어·몽골어처럼 조합이 없으면 "바로 입력"이라고 말한다', () => {
  expect(compositionLabel(summarizeLog([{ t: 0, type: 'input', value: 'б' }], ['cyrillic']))).toBe('조합 없이 바로 입력')
})

test('병음처럼 로마자로 조합하면 그렇게 말한다', () => {
  expect(compositionLabel(summarizeLog([{ t: 0, type: 'compositionupdate', data: 'he' }], ['hanzi']))).toBe('로마자로 조합해요')
})

test('가나·주음이 보이면 그렇게 말한다', () => {
  expect(compositionLabel(summarizeLog([{ t: 0, type: 'compositionupdate', data: 'ㄏㄜ' }], ['bopomofo']))).toBe('조합 중에 그 언어 글자가 보여요')
})
