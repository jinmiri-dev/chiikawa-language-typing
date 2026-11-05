/** 화면 글 줄바꿈: 문장 끝(!?.…~ 와 닫는 괄호·따옴표) 뒤 띄어쓰기에서 문장을 나눈다. 숫자 속 점(1.2초)은 띄어쓰기가 없어 그대로. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[!?.…~！？。][)"'”’）」』]*)\s+/u)
    .map((s) => s.trim())
    .filter(Boolean)
}

const SENT_END = /[!?.…~！？。]$/
const CLOSERS = /^[)"'”’）」』]+$/

/**
 * 연습 문장 조각을 문장별로 묶는다(문장 가운데서 줄이 바뀌지 않게). 문장 끝 조각 뒤에서 나누고,
 * 그 사이 띄어쓰기 조각은 묶음 밖에 ' ' 로 둔다(거기서 줄이 바뀔 수 있게). 닫는 괄호·따옴표는 앞 문장에.
 */
export function sentenceGroups(segs: { text: string }[]): (number[] | ' ')[] {
  const out: (number[] | ' ')[] = []
  let cur: number[] = []
  let ended = false
  segs.forEach((g, i) => {
    if (ended && !CLOSERS.test(g.text)) {
      out.push(cur)
      cur = []
      ended = false
      if (!g.text.trim()) {
        out.push(' ')
        return
      }
    }
    cur.push(i)
    if (SENT_END.test(g.text)) ended = true
  })
  if (cur.length) out.push(cur)
  return out
}
