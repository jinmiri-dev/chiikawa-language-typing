/** 미리 만든 읽기를 작게 담고 푼다. 조각 하나 = [글자, 읽기(글자와 같으면 빈칸), 표시(1 낱말, 2 확실)] */
import type { Segment } from '../../engine/types'

export type Packed = [text: string, reading: string, flags: number][]

export function packSegments(segs: Segment[]): Packed {
  return segs.map((g) => [g.text, g.reading && g.reading !== g.text ? g.reading : '', (g.isWord ? 1 : 0) | (g.confident ? 2 : 0)])
}

export function unpackSegments(p: Packed): Segment[] {
  return p.map(([text, reading, flags]) => ({ text, reading: reading || text, isWord: (flags & 1) === 1, confident: (flags & 2) === 2 }))
}

/** 일본어 코스·예문의 미리 만든 읽기(필요할 때만 받는다) */
export async function loadJaReadings(): Promise<Record<string, Packed>> {
  return (await import('./ja.json')).default as unknown as Record<string, Packed>
}
