import type { KeyDef, Layout } from '../types'

const row = (r: number, keys: [string, string, number?][]): KeyDef[] =>
  keys.map(([id, label, w], col) => ({ id, label, row: r, col, ...(w ? { w } : {}) }))
const letters = (s: string): [string, string][] => [...s].map((c) => [c, c.toUpperCase()])

/** PC 키보드(US 배열) 줄. 와이어프레임 04의 키보드 그림과 같은 줄 구성. */
const PC_ROWS: KeyDef[][] = [
  row(0, [['backquote', '`'], ...[...'1234567890'].map((c): [string, string] => [c, c]), ['minus', '-'], ['equal', '='], ['backspace', '⌫', 2]]),
  row(1, [['tab', 'Tab', 1.5], ...letters('qwertyuiop'), ['bracketleft', '['], ['bracketright', ']'], ['backslash', '\\', 1.5]]),
  row(2, [['caps', 'Caps', 1.75], ...letters('asdfghjkl'), ['semicolon', ';'], ['quote', "'"], ['enter', 'Enter', 2.25]]),
  row(3, [['shift', 'Shift', 2.25], ...letters('zxcvbnm'), ['comma', ','], ['period', '.'], ['slash', '/'], ['shiftRight', 'Shift', 2.75]]),
  row(4, [['space', 'Space', 6]]),
]

/** labels 로 키에 다른 글자를 적는다(주음·키릴 배열). 실제 키보드의 영문 자리는 PC 그림에서만 작게 따로 적는다(KeyboardMap). */
export function pcRows(labels: Record<string, string> = {}): KeyDef[][] {
  return PC_ROWS.map((r) => r.map((k) => (labels[k.id] ? { ...k, label: labels[k.id] } : k)))
}

export const jaPcRomaji: Layout = { id: 'ja-pc-romaji', lang: 'ja', device: 'pc', verified: true, rows: pcRows() }

/** 글자 하나 → 눌러야 할 키 (Shift 포함). 영어·로마자·병음 문장부호에 함께 쓴다. */
export const PC_CHAR_KEYS: Record<string, string[]> = {
  '-': ['minus'], ',': ['comma'], '.': ['period'], '/': ['slash'], ';': ['semicolon'], "'": ['quote'], '`': ['backquote'], '=': ['equal'],
  '!': ['shift', '1'], '?': ['shift', 'slash'], '~': ['shift', 'backquote'], ' ': ['space'], ':': ['shift', 'semicolon'], '"': ['shift', 'quote'],
  '[': ['bracketleft'], ']': ['bracketright'], '(': ['shift', '9'], ')': ['shift', '0'], '@': ['shift', '2'], '&': ['shift', '7'],
  ...Object.fromEntries([...'0123456789'].map((d) => [d, [d]])),
}
