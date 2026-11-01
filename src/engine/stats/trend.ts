/** 효과 기록 (기획안 20.2): 기본 연습 한 줄 평균 시간이 2주 전(또는 처음)보다 얼마나 줄었나. 빨라졌을 때만 보인다. */
import { LANG_NAME, type Lang } from '../lang'
import type { StatRecord } from '../types'

const DAY = 86_400_000
const MIN_RECORDS = 3
const RECENT = 3

/** 이 기기 시간대의 날짜 `YYYY-MM-DD` */
export function dayKey(t: number): string {
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const avg = (xs: StatRecord[]) => xs.reduce((a, r) => a + r.avgMs, 0) / xs.length

export function lineSpeedTrend(records: StatRecord[], lang: Lang, now: number): { before: number; after: number; text: string } | null {
  const mine = records.filter((r) => r.lang === lang).sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))
  if (mine.length < MIN_RECORDS) return null
  const cut = dayKey(now - 14 * DAY)
  const old = mine.filter((r) => r.day <= cut)
  const twoWeeks = old.length > 0 && old.length < mine.length
  const baseline = twoWeeks ? old : mine.slice(0, 1)
  const after = avg(mine.slice(baseline.length).slice(-RECENT))
  const before = avg(baseline)
  const diff = Math.round((before - after) / 100) / 10
  if (diff <= 0) return null
  return { before, after, text: `${LANG_NAME[lang].ko} · ${twoWeeks ? '2주 전보다' : '처음보다'} 한 줄 ${diff.toFixed(1)}초 빨라졌어요` }
}
