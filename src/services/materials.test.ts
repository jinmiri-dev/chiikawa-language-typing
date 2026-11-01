import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, test } from 'vitest'
import { getMaterial, newScriptId } from './materials'
import { memoryStore, openStore, type Store } from './storage'
import type { Material } from '../engine/types'

const script = (id: string, lang: Material['lang'] = 'ja'): Material => ({
  id, lang, kind: 'script', title: '대본', koSource: 'given', createdAt: 1,
  lines: [{ id: 'l1', src: 'こんにちは', ko: '안녕', segments: [{ text: 'こんにちは', reading: 'こんにちは', isWord: true, confident: true }] }],
})

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe.each([
  ['IndexedDB', () => openStore()],
  ['메모리', async () => memoryStore()],
])('%s 저장소', (_name, make: () => Promise<Store>) => {
  test('재료 저장·목록·삭제', async () => {
    const s = await make()
    await s.saveMaterial(script('ja-s1'))
    await s.saveMaterial(script('mn-s2', 'mn'))
    expect((await s.getMaterial('ja-s1'))?.title).toBe('대본')
    expect((await s.listMaterials('ja')).map((m) => m.id)).toEqual(['ja-s1'])
    await s.deleteMaterial('ja-s1')
    expect(await s.getMaterial('ja-s1')).toBeNull()
  })

  test('단어·복습·기록·메타', async () => {
    const s = await make()
    await s.saveWord({ id: 'w1', lang: 'ja', text: '元気', from: { materialId: 'ja-greet', lineId: 'greet-01' } })
    await s.saveReview({ id: 'r1', ref: { materialId: 'ja-greet', lineId: 'greet-01' }, due: 5, step: 0 })
    await s.addStat({ id: 'st1', lang: 'ja', day: '2026-11-01', avgMs: 5000, accuracy: 0.9 })
    await s.setMeta('backupAt', 123)
    expect((await s.listWords('ja')).length).toBe(1)
    expect((await s.listReview())[0].due).toBe(5)
    expect((await s.listStats('ja'))[0].avgMs).toBe(5000)
    expect(await s.getMeta('backupAt')).toBe(123)
    await s.deleteWord('w1')
    expect(await s.listWords()).toEqual([])
  })
})

test('getMaterial: 기본 연습과 저장 재료를 같은 함수로', async () => {
  const s = memoryStore()
  await s.saveMaterial(script('ja-s1'))
  expect((await getMaterial(s, 'ja-greet'))?.title).toBe('인사와 대답')
  expect((await getMaterial(s, 'ja-s1'))?.kind).toBe('script')
  expect(await getMaterial(s, 'ja-nope')).toBeNull()
})

test('대본 재료 id', () => expect(newScriptId('ja', 1_700_000_000_000)).toMatch(/^ja-s[0-9a-z]+$/))
