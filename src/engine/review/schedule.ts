/** 오늘의 복습 일정 (기획안 7.1): 1일 → 3일 → 7일 → 졸업. 틀리면 1일로 돌아간다. */
import type { ReviewItem } from '../types'

export const DAY = 24 * 60 * 60 * 1000
const GAP_DAYS = [1, 3, 7]

type Ref = ReviewItem['ref']

/** 복습 항목 id 와 복습 재료의 줄 id 는 같다 */
export const reviewId = (ref: Ref) => `${ref.materialId}|${ref.lineId}`

export function newReviewItem(ref: Ref, now: number): ReviewItem {
  return { id: reviewId(ref), ref, step: 0, due: now + DAY }
}

export function schedule(item: ReviewItem, correct: boolean, now: number): ReviewItem {
  if (!correct) return { ...item, step: 0, due: now + DAY }
  const step = Math.min(3, item.step + 1) as ReviewItem['step']
  return { ...item, step, due: step === 3 ? now : now + GAP_DAYS[step] * DAY }
}

export function dueToday(items: ReviewItem[], now: number, max = 5): ReviewItem[] {
  return items
    .filter((i) => i.step < 3 && i.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, max)
}
