/** 나눈 초안 줄 → 연습 재료. 읽기를 만들지 못하면 줄마다 "읽기 확인 필요"로 둔다. */
import type { Lang } from '../lang'
import type { Line, Material, Segment } from '../types'
import type { Segmenter } from './edit'
import type { DraftLine } from './parse'

export function buildDraftMaterial(opts: {
  id: string
  lang: Lang
  title: string
  lines: DraftLine[]
  /** 언어별 읽기 만들기. 불러오지 못했으면 null(줄마다 읽기 확인 필요) */
  segment: Segmenter | null
  youtubeId?: string
  now?: number
}): Material {
  const lines: Line[] = opts.lines.map((d, i) => {
    let segments: Segment[]
    try {
      if (!opts.segment) throw new Error('읽기 없음')
      segments = opts.segment(d.src)
    } catch {
      segments = [{ text: d.src, reading: d.src, isWord: true, confident: false }]
    }
    const needsCheck: ('reading' | 'ko')[] = []
    if (segments.some((g) => !g.confident)) needsCheck.push('reading')
    if (!d.ko) needsCheck.push('ko')
    return {
      id: `l${String(i + 1).padStart(3, '0')}`,
      src: d.src,
      ...(d.ko ? { ko: d.ko } : {}),
      ...(d.start !== undefined ? { start: d.start } : {}),
      ...(d.end !== undefined ? { end: d.end } : {}),
      ...(d.removed?.length ? { removed: d.removed } : {}),
      segments,
      ...(needsCheck.length ? { needsCheck } : {}),
    }
  })
  return {
    id: opts.id,
    lang: opts.lang,
    kind: 'script',
    title: opts.title,
    ...(opts.youtubeId ? { youtubeId: opts.youtubeId } : {}),
    koSource: lines.some((l) => l.ko) ? 'given' : 'none',
    lines,
    createdAt: opts.now ?? Date.now(),
  }
}
