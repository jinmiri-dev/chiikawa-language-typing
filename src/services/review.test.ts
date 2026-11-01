import { expect, test } from 'vitest'
import { buildReviewMaterial, buildSavedLinesMaterial, REVIEW_ID, reviewCount } from './review'
import { memoryStore } from './storage'
import { DAY, newReviewItem } from '../engine/review/schedule'
import type { Word } from '../engine/types'

test('때가 된 복습 줄을 모아 재료로, 줄 id 는 원래 위치', async () => {
  const s = memoryStore()
  await s.saveReview(newReviewItem({ materialId: 'ja-greet', lineId: 'greet-02' }, 0))
  await s.saveReview(newReviewItem({ materialId: 'ja-plan', lineId: 'plan-01' }, 5 * DAY))
  expect(await reviewCount(s, 2 * DAY)).toBe(1)
  const m = (await buildReviewMaterial(s, 2 * DAY))!
  expect(m.id).toBe(REVIEW_ID)
  expect(m.lines.map((l) => [l.id, l.src])).toEqual([['ja-greet|greet-02', 'うん、元気だよ。']])
  expect(await s.getMaterial(REVIEW_ID)).not.toBeNull()
})

test('복습할 것이 없으면 null', async () => expect(await buildReviewMaterial(memoryStore(), 0)).toBeNull())

test('담은 줄만 다시 연습: 같은 줄은 한 번만', async () => {
  const ex = { src: 'おはよう！元気？', ko: '좋은 아침! 잘 지내?', segments: [] }
  const words: Word[] = [
    { id: 'ja:元気', lang: 'ja', text: '元気', from: { materialId: 'ja-greet', lineId: 'greet-01' }, example: ex },
    { id: 'ja-greet|greet-01', lang: 'ja', text: ex.src, wholeLine: true, from: { materialId: 'ja-greet', lineId: 'greet-01' }, example: ex },
  ]
  const m = (await buildSavedLinesMaterial(memoryStore(), 'ja', words, 1))!
  expect(m.lines.map((l) => l.src)).toEqual(['おはよう！元気？'])
  expect(m.title).toBe('담은 줄 다시 연습')
})
