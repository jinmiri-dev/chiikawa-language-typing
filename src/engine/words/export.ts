/** 단어장 내려받기 (기획안 13장): CSV 는 암기 앱용, TXT 는 복습용 */
import type { Word } from '../types'

const cell = (s = '') => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s)

export function wordsCsv(words: Word[]): string {
  const rows = [['단어', '발음', '뜻', '예문', '예문 뜻'], ...words.map((w) => [w.text, w.reading, w.meaning, w.example?.src, w.example?.ko])]
  // 엑셀에서 한글이 깨지지 않게 BOM 을 붙인다
  return '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}

export function wordsTxt(words: Word[]): string {
  return words
    .map((w) => {
      const head = `${w.text}${w.reading && w.reading !== w.text ? ` (${w.reading})` : ''}${w.meaning ? ` — ${w.meaning}` : ''}`
      const ex = w.example && !w.wholeLine ? `\n  ${w.example.src}${w.example.ko ? ` / ${w.example.ko}` : ''}` : w.wholeLine && w.example?.ko ? `\n  ${w.example.ko}` : ''
      return head + ex + '\n'
    })
    .join('')
}
