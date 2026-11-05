/**
 * 영어·중국어·대만어·몽골어 배열 데이터 (기획안 6·11.4장).
 * 휴대폰 쿼티(영어·병음)와 몽골어 키릴은 실제 기기(삼성 키보드, 2026-11-05 입력 시험)로 확인했다.
 * 병음 9키와 대만 주음 휴대폰 자판은 아직이라 verified: false(글로 읽기만 안내).
 */
import type { KeyDef, Layout } from '../types'
import { jaMobileRomaji } from './ja-mobile-romaji'
import { pcRows } from './ja-pc-romaji'

/** 휴대폰 쿼티 줄(일본어 로마자 자판과 같은 모양) */
const mobileQwerty = (labels: Record<string, string> = {}): KeyDef[][] =>
  jaMobileRomaji.rows.map((r) => r.map((k) => (labels[k.id] ? { ...k, label: labels[k.id] } : k)))

export const enQwerty: Layout = { id: 'en-qwerty', lang: 'en', device: 'pc', verified: true, rows: pcRows() }
export const enQwertyMobile: Layout = { id: 'en-qwerty-mobile', lang: 'en', device: 'mobile', verified: true, rows: mobileQwerty() }

export const zhPinyin: Layout = { id: 'zh-pinyin', lang: 'zh', device: 'pc', verified: true, rows: pcRows() }
export const zhPinyinMobile: Layout = { id: 'zh-pinyin-mobile', lang: 'zh', device: 'mobile', verified: true, rows: mobileQwerty() }
export const twPinyin: Layout = { id: 'tw-pinyin', lang: 'tw', device: 'pc', verified: true, rows: pcRows() }
export const twPinyinMobile: Layout = { id: 'tw-pinyin-mobile', lang: 'tw', device: 'mobile', verified: true, rows: mobileQwerty() }

/** 병음 9키: 숫자 키에 글자가 묶여 있다 */
export const NINE_KEY: Record<string, string> = Object.fromEntries(
  ['abc', 'def', 'ghi', 'jkl', 'mno', 'pqrs', 'tuv', 'wxyz'].flatMap((s, i) => [...s].map((c) => [c, `k${i + 2}`])),
)
const k = (id: string, label: string, row: number, col: number, w?: number): KeyDef => ({ id, label, row, col, ...(w ? { w } : {}) })
export const zhPinyin9key: Layout = {
  id: 'zh-pinyin-9key',
  lang: 'zh',
  device: 'mobile',
  verified: false,
  rows: [
    [k('k1', '1 ，。？', 0, 0), k('k2', '2 ABC', 0, 1), k('k3', '3 DEF', 0, 2)],
    [k('k4', '4 GHI', 1, 0), k('k5', '5 JKL', 1, 1), k('k6', '6 MNO', 1, 2)],
    [k('k7', '7 PQRS', 2, 0), k('k8', '8 TUV', 2, 1), k('k9', '9 WXYZ', 2, 2)],
    [k('sym', '符', 3, 0), k('space', '공백', 3, 1), k('del', '⌫', 3, 2)],
  ],
}

/** 대만 주음 大千 배열: 키 → 기호. 성조 키 1성 Space, 2성 6, 3성 3, 4성 4, 경성 7 */
export const DAQIAN: Record<string, string> = {
  '1': 'ㄅ', '2': 'ㄉ', '3': 'ˇ', '4': 'ˋ', '5': 'ㄓ', '6': 'ˊ', '7': '˙', '8': 'ㄚ', '9': 'ㄞ', '0': 'ㄢ', minus: 'ㄦ',
  q: 'ㄆ', w: 'ㄊ', e: 'ㄍ', r: 'ㄐ', t: 'ㄔ', y: 'ㄗ', u: 'ㄧ', i: 'ㄛ', o: 'ㄟ', p: 'ㄣ',
  a: 'ㄇ', s: 'ㄋ', d: 'ㄎ', f: 'ㄑ', g: 'ㄕ', h: 'ㄘ', j: 'ㄨ', k: 'ㄜ', l: 'ㄠ', semicolon: 'ㄤ',
  z: 'ㄈ', x: 'ㄌ', c: 'ㄏ', v: 'ㄒ', b: 'ㄖ', n: 'ㄙ', m: 'ㄩ', comma: 'ㄝ', period: 'ㄡ', slash: 'ㄥ',
}
export const twZhuyinPc: Layout = { id: 'tw-zhuyin-pc', lang: 'tw', device: 'pc', verified: true, rows: pcRows(DAQIAN) }

/** 휴대폰 주음 자판: 大千 순서 그대로 기호 키를 늘어놓는다(키 id = 기호) */
const ZHUYIN_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'minus'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'semicolon'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', 'comma', 'period', 'slash'],
]
export const twZhuyinMobile: Layout = {
  id: 'tw-zhuyin-mobile',
  lang: 'tw',
  device: 'mobile',
  verified: false,
  rows: [
    ...ZHUYIN_ROWS.map((r, ri) => r.map((key, ci) => k(DAQIAN[key], DAQIAN[key], ri, ci))),
    [k('sym', '符', 4, 0, 1.5), k('space', '공백', 4, 1, 5), k('enter', '확정', 4, 2, 2)],
  ],
}

/** 몽골어 키릴(Windows 표준): 영문 키 → 키릴 글자 */
export const MN_KEYS: Record<string, string> = {
  q: 'ф', w: 'ц', e: 'у', r: 'ж', t: 'э', y: 'н', u: 'г', i: 'ш', o: 'ү', p: 'з', bracketleft: 'к', bracketright: 'ъ',
  a: 'й', s: 'ы', d: 'б', f: 'ө', g: 'а', h: 'х', j: 'р', k: 'о', l: 'л', semicolon: 'д', quote: 'п',
  z: 'я', x: 'ч', c: 'ё', v: 'с', b: 'м', n: 'и', m: 'т', comma: 'ь', period: 'в', slash: 'ю',
  minus: 'е', equal: 'щ',
}
// Windows 몽골어(키릴) 배열(kbdmon)과 글자 키를 맞춰 확인함(2026-11-05)
export const mnCyrillic: Layout = { id: 'mn-cyrillic', lang: 'mn', device: 'pc', verified: true, rows: pcRows(MN_KEYS) }
export const mnCyrillicMobile: Layout = {
  id: 'mn-cyrillic-mobile',
  lang: 'mn',
  device: 'mobile',
  verified: true,
  rows: [
    ...pcRows(MN_KEYS)
      .slice(0, 4)
      .map((r, ri) => r.filter((key) => MN_KEYS[key.id] || key.id === 'shift').map((key, ci) => ({ ...key, row: ri, col: ci, w: key.id === 'shift' ? 1.5 : undefined }))),
    [k('sym', '123', 4, 0, 1.5), k('space', '공백', 4, 1, 5), k('enter', '확인', 4, 2, 2)],
  ],
}
