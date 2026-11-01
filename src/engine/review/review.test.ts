import { describe, expect, test } from 'vitest'
import { DAY, dueToday, newReviewItem, reviewId, schedule } from './schedule'
import { wordsCsv, wordsTxt } from '../words/export'
import type { Word } from '../types'

const ref = { materialId: 'ja-greet', lineId: 'greet-01' }

describe('복습 일정', () => {
  test('새 항목은 1일 뒤', () => expect(newReviewItem(ref, 0)).toEqual({ id: reviewId(ref), ref, step: 0, due: DAY }))
  test('맞히면 1일 → 3일 → 7일 → 졸업', () => {
    let it = newReviewItem(ref, 0)
    it = schedule(it, true, DAY)
    expect([it.step, it.due]).toEqual([1, DAY + 3 * DAY])
    it = schedule(it, true, 4 * DAY)
    expect([it.step, it.due]).toEqual([2, 4 * DAY + 7 * DAY])
    it = schedule(it, true, 11 * DAY)
    expect(it.step).toBe(3)
  })
  test('틀리면 1일로 돌아간다', () => {
    const it = schedule({ ...newReviewItem(ref, 0), step: 2 }, false, 10 * DAY)
    expect([it.step, it.due]).toEqual([0, 11 * DAY])
  })
  test('오늘 볼 것: 때가 된 것만, 졸업 빼고, 오래된 순 최대 5개', () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ ...newReviewItem({ materialId: 'm', lineId: `l${i}` }, 0), due: i * 10 }))
    items[0].step = 3
    const due = dueToday(items, 65)
    expect(due.map((d) => d.ref.lineId)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5'])
    expect(dueToday(items, 5)).toEqual([])
  })
})

describe('단어장 내려받기', () => {
  const words: Word[] = [
    { id: 'ja:元気', lang: 'ja', text: '元気', reading: 'げんき', meaning: '건강, 잘 지냄', from: ref, example: { src: 'おはよう！元気？', ko: '좋은 아침! 잘 지내?', segments: [] } },
    { id: 'ja:x', lang: 'ja', text: '"引用"', from: ref },
  ]
  test('CSV: 단어/발음/뜻/예문/예문 뜻, 쉼표·따옴표 처리, 엑셀용 BOM', () => {
    const csv = wordsCsv(words)
    expect(csv.startsWith('﻿단어,발음,뜻,예문,예문 뜻\r\n')).toBe(true)
    expect(csv).toContain('元気,げんき,"건강, 잘 지냄",おはよう！元気？,좋은 아침! 잘 지내?\r\n')
    expect(csv).toContain('"""引用""",,,,')
  })
  test('TXT', () => expect(wordsTxt(words.slice(0, 1))).toBe('元気 (げんき) — 건강, 잘 지냄\n  おはよう！元気？ / 좋은 아침! 잘 지내?\n'))
})
