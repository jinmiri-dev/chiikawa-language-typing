/** 나눈 결과 정리 (기획안 7.6). 모두 새 배열을 돌려주고, 줄 번호(id)는 순서대로 다시 매긴다. */
import type { Lang } from '../lang'
import type { Line, Segment } from '../types'

/** 원문이 바뀌면 조각·읽기를 다시 만든다 */
export type Segmenter = (src: string) => Segment[]

/** 확인 필요 표시를 지금 내용으로 다시 계산 */
export function recheck(line: Line): Line {
  const needsCheck: ('reading' | 'ko')[] = []
  if (line.segments.some((g) => !g.confident)) needsCheck.push('reading')
  if (!line.ko?.trim()) needsCheck.push('ko')
  const { needsCheck: _old, ...rest } = line
  return needsCheck.length ? { ...rest, needsCheck } : rest
}

function renumber(lines: Line[]): Line[] {
  return lines.map((l, i) => recheck({ ...l, id: `l${String(i + 1).padStart(3, '0')}` }))
}

const withSrc = (l: Line, src: string, seg: Segmenter): Line => ({ ...l, src, segments: seg(src) })

export function mergeUp(lines: Line[], i: number, seg: Segmenter): Line[] {
  if (i <= 0 || i >= lines.length) return lines
  const a = lines[i - 1]
  const b = lines[i]
  const ko = [a.ko, b.ko].filter(Boolean).join(' ')
  const merged: Line = {
    ...withSrc(a, a.src + b.src, seg),
    ...(ko ? { ko } : {}),
    ...(b.end !== undefined ? { end: b.end } : {}),
    ...(a.removed || b.removed ? { removed: [...(a.removed ?? []), ...(b.removed ?? [])] } : {}),
  }
  if (!ko) delete merged.ko
  return renumber([...lines.slice(0, i - 1), merged, ...lines.slice(i + 1)])
}

export function splitAt(lines: Line[], i: number, pos: number, seg: Segmenter): Line[] {
  const l = lines[i]
  const chars = [...l.src]
  if (!l || pos <= 0 || pos >= chars.length) return lines
  const first = withSrc(l, chars.slice(0, pos).join('').trim(), seg)
  const { ko: _ko, removed: _r, ...rest } = l
  const second = withSrc({ ...rest, ...(l.end !== undefined ? { end: l.end } : {}) }, chars.slice(pos).join('').trim(), seg)
  return renumber([...lines.slice(0, i), first, second, ...lines.slice(i + 1)])
}

/** 뜻 열만 한 칸 밀기: dir -1 은 아래 뜻을 위로 당기고, +1 은 고른 줄부터 아래로 민다 */
export function shiftKo(lines: Line[], from: number, dir: -1 | 1): Line[] {
  const ko = lines.map((l) => l.ko)
  if (dir === 1 && ko[ko.length - 1]) return lines // 마지막 뜻이 사라지므로 하지 않는다
  const next = ko.map((_, k) => (k < from ? ko[k] : dir === -1 ? ko[k + 1] : k === from ? undefined : ko[k - 1]))
  return renumber(
    lines.map((l, k) => {
      const { ko: _old, ...rest } = l
      return next[k] ? { ...rest, ko: next[k] } : rest
    }),
  )
}

export function removeLines(lines: Line[], idx: number[]): Line[] {
  const drop = new Set(idx)
  return renumber(lines.filter((_, k) => !drop.has(k)))
}

export function restoreRemoved(line: Line, tag: string, seg: Segmenter): Line {
  const removed = (line.removed ?? []).filter((t) => t !== tag)
  const { removed: _r, ...rest } = withSrc(line, `${tag} ${line.src}`, seg)
  return removed.length ? { ...rest, removed } : rest
}

/** 줄 하나 고치기(원문·뜻·읽기). 읽기를 직접 고치면 그 줄은 한 조각으로 확정한다. */
const HAN = /\p{Script=Han}/u
const hanCount = (s: string) => [...s].filter((c) => HAN.test(c)).length

/**
 * 읽기 고치기. 중국어·대만어는 띄어 쓴 음절을 한자 수대로 낱말에 나눠 준다(대만어는 주음, 중국어는 병음).
 * 그래야 낱말마다 키 안내가 남는다. 음절 수가 한자 수와 안 맞거나 다른 언어면 줄 전체를 한 조각으로.
 */
function withReading(l: Line, reading: string, lang?: Lang): Line {
  const text = reading.trim()
  const syl = text.split(/\s+/).filter(Boolean)
  const total = l.segments.reduce((a, g) => a + hanCount(g.text), 0)
  if ((lang === 'tw' || lang === 'zh') && total > 0 && total === syl.length) {
    let k = 0
    const segments = l.segments.map((g): Segment => {
      const n = hanCount(g.text)
      if (!n) return g
      const part = syl.slice(k, (k += n)).join(' ')
      return lang === 'tw' ? { ...g, zhuyin: part, confident: true } : { ...g, reading: part, confident: true }
    })
    return { ...l, segments }
  }
  return { ...l, segments: [{ text: l.src, reading: text, isWord: true, confident: true }] }
}

export function editLine(lines: Line[], i: number, patch: { src?: string; ko?: string; reading?: string }, seg: Segmenter, lang?: Lang): Line[] {
  let l = lines[i]
  if (patch.src !== undefined) l = withSrc(l, patch.src.trim(), seg)
  if (patch.ko !== undefined) {
    const { ko: _old, ...rest } = l
    l = patch.ko.trim() ? { ...rest, ko: patch.ko.trim() } : rest
  }
  if (patch.reading !== undefined) l = withReading(l, patch.reading, lang)
  return renumber(lines.map((x, k) => (k === i ? l : x)))
}
