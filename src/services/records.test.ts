import { expect, test } from 'vitest'
import { ghostProgress, getLangBest, saveRun } from './records'
import { memoryStore } from './storage'

test('더 빠를 때만 최고 기록을 바꾼다(재료·언어)', async () => {
  const store = memoryStore()
  const run = (cpm: number) => ({ cpm, accuracy: 90, lineMs: [1000], at: 0 })
  expect(await saveRun(store, 'ja', 'a', run(100))).toMatchObject({ materialRecord: true, langRecord: true })
  expect(await saveRun(store, 'ja', 'a', run(80))).toMatchObject({ materialRecord: false, langRecord: false })
  expect(await saveRun(store, 'ja', 'b', run(120))).toMatchObject({ materialRecord: true, langRecord: true })
  expect((await getLangBest(store, 'ja'))?.materialId).toBe('b')
})

test('지난 나의 위치', () => {
  expect(ghostProgress([1000, 2000], 500)).toBe(0.5)
  expect(ghostProgress([1000, 2000], 2000)).toBe(1.5)
  expect(ghostProgress([1000, 2000], 9999)).toBe(2)
})
