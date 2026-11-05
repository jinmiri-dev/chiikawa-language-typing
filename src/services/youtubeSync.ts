/**
 * 유튜브 재료: 영상과 타자를 함께 가게 한다.
 * 지금 줄 끝을 지나는 순간 멈추고, 진행 막대를 끌어 다른 줄로 가면(시각이 2초 넘게 뛰면) 그 줄로 옮긴다.
 */
export interface Span {
  start?: number
  end?: number
}

const endOf = (lines: Span[], i: number) => lines[i].end ?? lines[i + 1]?.start ?? Infinity

export function syncStep(lines: Span[], idx: number, prevT: number, t: number): { pause?: true; goTo?: number } {
  const line = lines[idx]
  if (!line || line.start === undefined) return {}
  if (Math.abs(t - prevT) > 2) {
    // 끈 곳이 들어 있는 줄, 줄 사이면 그다음 줄
    let k = lines.findIndex((l, i) => l.start !== undefined && l.start <= t && t < endOf(lines, i))
    if (k < 0) k = lines.findIndex((l) => l.start !== undefined && l.start > t)
    return k >= 0 && k !== idx ? { goTo: k } : {}
  }
  const end = endOf(lines, idx) - 0.2
  return prevT < end && t >= end ? { pause: true } : {}
}
