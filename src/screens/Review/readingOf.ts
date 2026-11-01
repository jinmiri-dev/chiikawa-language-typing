import type { Line, Material } from '../../engine/types'

/** 읽기 칸: 일본어는 가나를 붙여서, 대만어는 주음, 몽골어는 전사, 그 밖은 낱말마다 띄워서 */
export function readingOf(lang: Material['lang'], l: Line): string {
  if (lang === 'ja') return l.segments.map((g) => g.reading ?? g.text).join('')
  const pick = (g: Line['segments'][number]) => (lang === 'tw' ? (g.zhuyin ?? g.reading) : lang === 'mn' ? (g.romaji ?? g.text) : (g.reading ?? g.text))
  return l.segments
    .filter((g) => g.isWord)
    .map(pick)
    .join(' ')
}
