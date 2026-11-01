import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, expect, test } from 'vitest'
import { openStore } from './storage'
import { DEFAULT_SETTINGS, type Progress } from '../engine/types'

const progress = (materialId: string, updatedAt: number): Progress => ({
  materialId, lineIndex: 1, results: [], activeMs: 0, friend: 'chiikawa', updatedAt,
})

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

test('설정 기본값', async () => {
  const store = await openStore()
  expect(store.persistent).toBe(true)
  expect(await store.getSettings()).toEqual(DEFAULT_SETTINGS)
})

test('저장한 것은 다시 열어도 남는다', async () => {
  const a = await openStore()
  await a.saveSettings({ ...DEFAULT_SETTINGS, friend: 'usagi' })
  await a.saveProgress(progress('ja-greet', 1))
  const b = await openStore()
  expect((await b.getSettings()).friend).toBe('usagi')
  expect((await b.getProgress('ja-greet'))?.lineIndex).toBe(1)
  expect(await b.getProgress('ja-plan')).toBeNull()
})

test('이어서 공부하기는 가장 최근 것', async () => {
  const s = await openStore()
  await s.saveProgress(progress('ja-greet', 5))
  await s.saveProgress(progress('ja-plan', 9))
  await s.saveProgress(progress('ja-bye', 2))
  expect((await s.lastProgress())?.materialId).toBe('ja-plan')
  expect((await s.listProgress('ja')).map((p) => p.materialId).sort()).toEqual(['ja-bye', 'ja-greet', 'ja-plan'])
  expect(await s.listProgress('mn')).toEqual([])
})

test('IndexedDB 가 없으면 메모리로 돈다', async () => {
  // @ts-expect-error 사생활 보호 모드 흉내
  delete globalThis.indexedDB
  const s = await openStore()
  expect(s.persistent).toBe(false)
  await s.saveProgress(progress('ja-greet', 1))
  expect((await s.lastProgress())?.materialId).toBe('ja-greet')
  expect(await s.getSettings()).toEqual(DEFAULT_SETTINGS)
})
