/** 따라 쓰기 학습지: 문장을 원고지 칸으로 나눈다(한 칸 한 글자, 띄어쓰기 한 칸, 줄은 띄어쓰기에서 바꾼다). */
export function sheetRows(text: string, cols: number): string[][] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const rows: string[][] = []
  let cur: string[] = []
  const flush = () => {
    if (cur.length) rows.push([...cur, ...Array(cols - cur.length).fill('')])
    cur = []
  }
  for (const w of words) {
    const chars = [...w]
    // 앞에 글자가 있으면 띄어쓰기 한 칸
    const need = (cur.length ? 1 : 0) + chars.length
    if (cur.length && cur.length + need > cols) flush()
    if (cur.length) cur.push('')
    for (const ch of chars) {
      if (cur.length === cols) flush()
      cur.push(ch)
    }
  }
  flush()
  return rows
}
