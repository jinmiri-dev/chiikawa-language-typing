import { expect, test } from 'vitest'
import { sheetRows } from './sheet'

test('한 칸에 한 글자, 띄어쓰기는 빈칸, 문장부호도 한 칸', () => {
  expect(sheetRows('꽃이 피었습니다.', 12)).toEqual([['꽃', '이', '', '피', '었', '습', '니', '다', '.', '', '', '']])
})
test('칸보다 길면 띄어쓰기에서 다음 줄로(낱말을 가르지 않는다)', () => {
  const rows = sheetRows('곰 세 마리가 한 집에 있어', 8)
  expect(rows.map((r) => r.join('').trim())).toEqual(['곰세마리가', '한집에있어'])
  expect(rows.every((r) => r.length === 8)).toBe(true)
})
test('줄 앞 띄어쓰기는 칸을 쓰지 않는다', () => expect(sheetRows('안녕   하세요', 6)[0].slice(0, 3)).toEqual(['안', '녕', '']))
test('한 낱말이 칸보다 길면 그 낱말만 잘라 넘긴다', () => expect(sheetRows('가나다라마바사', 4).map((r) => r.join(''))).toEqual(['가나다라', '마바사']))
