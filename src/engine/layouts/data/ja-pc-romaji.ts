import type { KeyDef, Layout } from '../types'

const row = (r: number, keys: [string, string, number?][]): KeyDef[] =>
  keys.map(([id, label, w], col) => ({ id, label, row: r, col, ...(w ? { w } : {}) }))
const letters = (s: string): [string, string][] => [...s].map((c) => [c, c.toUpperCase()])

/** PC 키보드(US 배열). 와이어프레임 04의 키보드 그림과 같은 줄 구성. */
export const jaPcRomaji: Layout = {
  id: 'ja-pc-romaji',
  lang: 'ja',
  device: 'pc',
  verified: true,
  rows: [
    row(0, [['backquote', '`'], ...[...'1234567890'].map((c): [string, string] => [c, c]), ['minus', '-'], ['equal', '='], ['backspace', '⌫', 2]]),
    row(1, [['tab', 'Tab', 1.5], ...letters('qwertyuiop'), ['bracketleft', '['], ['bracketright', ']'], ['backslash', '\\', 1.5]]),
    row(2, [['caps', 'Caps', 1.75], ...letters('asdfghjkl'), ['semicolon', ';'], ['quote', "'"], ['enter', 'Enter', 2.25]]),
    row(3, [['shift', 'Shift', 2.25], ...letters('zxcvbnm'), ['comma', ','], ['period', '.'], ['slash', '/'], ['shiftRight', 'Shift', 2.75]]),
    row(4, [['space', 'Space', 6]]),
  ],
}

/** 로마자 한 글자 → 눌러야 할 키 (Shift 포함) */
export const PC_CHAR_KEYS: Record<string, string[]> = {
  '-': ['minus'], ',': ['comma'], '.': ['period'], '/': ['slash'],
  '!': ['shift', '1'], '?': ['shift', 'slash'], '~': ['shift', 'backquote'], ' ': ['space'],
  '[': ['bracketleft'], ']': ['bracketright'], '(': ['shift', '9'], ')': ['shift', '0'], ':': ['shift', 'semicolon'],
}
