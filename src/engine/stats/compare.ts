/** 지난번의 나와 비교 (기획안 7.8). 다른 사람과는 비교하지 않는다. */
import type { LineResult } from '../types'

export function avgLineMs(results: LineResult[]): number {
  return results.length ? results.reduce((a, r) => a + r.ms, 0) / results.length : 0
}

const sec = (ms: number) => (ms / 1000).toFixed(1)

export function compareText(prevMs: number | null, nowMs: number): string {
  if (prevMs === null) return '첫 기록이에요'
  const diff = Math.round((prevMs - nowMs) / 100) / 10
  if (diff <= 0) return '오늘은 꼼꼼하게 쳤어요'
  return `지난번보다 한 줄에 ${diff.toFixed(1)}초 빨라졌어요 · ${sec(prevMs)}초 → ${sec(nowMs)}초`
}
