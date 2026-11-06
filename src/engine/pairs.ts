/** 낱말 짝을 줄 안의 자리로: 원문 낱말을 앞에서부터 차례로 찾아 [시작, 끝) 범위를 붙인다. */
export interface PlacedPair {
  src: string
  ko: string
  start: number
  end: number
}

export function placePairs(line: string, pairs: [string, string][]): PlacedPair[] {
  const out: PlacedPair[] = []
  let from = 0
  for (const [src, ko] of pairs) {
    let at = line.indexOf(src, from)
    if (at < 0) at = line.indexOf(src)
    if (at < 0 || out.some((p) => at < p.end && at + src.length > p.start)) continue
    out.push({ src, ko, start: at, end: at + src.length })
    from = at + src.length
  }
  return out.sort((a, b) => a.start - b.start)
}

/** 지금 칠 자리의 낱말 짝(그 자리를 덮는 것, 없으면 바로 다음 것) */
export function currentPair(placed: PlacedPair[], at: number): PlacedPair | null {
  return placed.find((p) => at >= p.start && at < p.end) ?? placed.find((p) => p.start >= at) ?? null
}

/** 한국어 뜻에서 짝 낱말 자리(그대로 들어 있을 때만) */
export function koRange(ko: string, word: string): [number, number] | null {
  const at = ko.indexOf(word)
  return at < 0 ? null : [at, at + word.length]
}
