import type { KeyDef, Layout } from '../types'

const letters = (row: number, s: string, start = 0): KeyDef[] =>
  [...s].map((c, i) => ({ id: c, label: c, row, col: start + i }))

/** 휴대폰 로마자(쿼티) 자판. 문장부호와 장음은 기호 키(`sym`)에서 고른다. */
export const jaMobileRomaji: Layout = {
  id: 'ja-mobile-romaji',
  lang: 'ja',
  device: 'mobile',
  verified: false,
  rows: [
    letters(0, 'qwertyuiop'),
    letters(1, 'asdfghjkl'),
    [{ id: 'shift', label: '⇧', row: 2, col: 0, w: 1.5 }, ...letters(2, 'zxcvbnm', 1), { id: 'del', label: '⌫', row: 2, col: 8, w: 1.5 }],
    [
      { id: 'sym', label: '123', row: 3, col: 0, w: 1.5 },
      { id: 'space', label: '공백', row: 3, col: 1, w: 5 },
      { id: 'enter', label: '확정', row: 3, col: 2, w: 2 },
    ],
  ],
}
