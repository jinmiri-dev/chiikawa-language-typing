/** 타자 속도: 분당 글자(자/분). 띄어쓰기·문장부호까지 친 글자로 센다(채점과 같은 기준). */
import type { LineResult } from '../types'

export const perMinute = (chars: number, ms: number) => (ms > 0 ? Math.round((chars / ms) * 60_000) : 0)

/** 끝낸 줄들의 평균 속도와 정확도. chars: 줄 id → 친 글자 수 */
export function sessionStats(results: LineResult[], chars: Record<string, number>): { cpm: number; accuracy: number; lines: number } {
  const done = results.filter((r) => r.ms > 0 && chars[r.lineId])
  const total = done.reduce((n, r) => n + chars[r.lineId], 0)
  const ms = done.reduce((n, r) => n + r.ms, 0)
  const accuracy = done.length ? Math.round((done.reduce((n, r) => n + r.firstTryAccuracy, 0) / done.length) * 100) : 100
  return { cpm: perMinute(total, ms), accuracy, lines: done.length }
}

/** 속도 단계(친구 말과 색에 쓴다) */
export function speedLevel(cpm: number): 'start' | 'good' | 'fast' | 'pro' {
  if (cpm >= 300) return 'pro'
  if (cpm >= 180) return 'fast'
  if (cpm >= 90) return 'good'
  return 'start'
}
