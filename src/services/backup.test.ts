import { describe, expect, test } from 'vitest'
import { backupFileName, conflicts, exportBackup, importBackup, readShare, readShareFile, shareFile, shareLink } from './backup'
import { memoryStore, type Store } from './storage'
import { DEFAULT_SETTINGS, type Material } from '../engine/types'

const mat = (id: string, n = 2, text = 'こんにちは'): Material => ({
  id, lang: 'ja', kind: 'script', title: '대본', koSource: 'given', createdAt: 1,
  lines: Array.from({ length: n }, (_, i) => ({ id: `l${i}`, src: text, ko: '안녕', segments: [{ text, reading: text, isWord: true, confident: true }] })),
})

async function filled(): Promise<Store> {
  const s = memoryStore()
  await s.saveMaterial(mat('ja-s1'))
  await s.saveProgress({ materialId: 'ja-s1', lineIndex: 1, results: [], activeMs: 5, friend: 'usagi', updatedAt: 2 })
  await s.saveWord({ id: 'ja:元気', lang: 'ja', text: '元気', from: { materialId: 'ja-s1', lineId: 'l0' } })
  await s.saveReview({ id: 'ja-s1|l0', ref: { materialId: 'ja-s1', lineId: 'l0' }, due: 9, step: 1 })
  await s.addStat({ id: 'st', lang: 'ja', day: '2026-11-01', avgMs: 1, accuracy: 1 })
  await s.saveSettings({ ...DEFAULT_SETTINGS, friend: 'kani' })
  return s
}

describe('백업', () => {
  test('파일 이름', () => expect(backupFileName(new Date(2026, 10, 1))).toBe('language-grade1-backup-20261101.json'))

  test('내보내고 새 저장소에 복원하면 같다', async () => {
    const file = JSON.parse(JSON.stringify(await exportBackup(await filled())))
    expect(file).toMatchObject({ app: 'language-grade1', version: 1 })
    const t = memoryStore()
    const r = await importBackup(t, file, 'overwrite')
    expect(r).toEqual({ ok: true, counts: { materials: 1, progress: 1, words: 1, review: 1, stats: 1, saved: 0 } })
    expect((await t.getMaterial('ja-s1'))?.lines.length).toBe(2)
    expect((await t.getProgress('ja-s1'))?.friend).toBe('usagi')
    expect((await t.getSettings()).friend).toBe('kani')
  })

  test('다른 앱·다른 버전·깨진 파일은 거절하고 아무것도 안 바꾼다', async () => {
    const t = await filled()
    expect(await importBackup(t, { app: 'other', version: 1, data: {} }, 'overwrite')).toEqual({ ok: false, reason: '언어 1급 백업 파일이 아니에요.' })
    expect(await importBackup(t, { app: 'language-grade1', version: 9, data: {} }, 'overwrite')).toEqual({ ok: false, reason: '이 사이트와 버전이 다른 백업 파일이에요.' })
    expect(await importBackup(t, 'not json', 'overwrite')).toMatchObject({ ok: false })
    expect(await importBackup(t, { app: 'language-grade1', version: 1, data: { materials: 'x' } }, 'overwrite')).toMatchObject({ ok: false })
    expect((await t.getMaterial('ja-s1'))?.title).toBe('대본')
  })

  test('같은 재료가 있으면 알리고, 둘 다 두기면 새 id 로', async () => {
    const t = await filled()
    const file = await exportBackup(await filled())
    expect(await conflicts(t, file)).toBe(1)
    await importBackup(t, file, 'keepBoth')
    const ids = (await t.listMaterials('ja')).map((m) => m.id).sort()
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe('ja-s1')
    const copy = ids.find((i) => i !== 'ja-s1')!
    expect((await t.getProgress(copy))?.lineIndex).toBe(1)
  })
})

describe('공유', () => {
  test('짧은 연습은 링크로 오간다', () => {
    const link = shareLink(mat('ja-s1'))!
    expect(link).toMatch(/^[A-Za-z0-9+\-$]+$/)
    const m = readShare(link)!
    expect(m.lines.map((l) => [l.src, l.ko])).toEqual([['こんにちは', '안녕'], ['こんにちは', '안녕']])
    expect(m.id).toMatch(/^ja-s/)
    expect(m.kind).toBe('script')
  })
  test('너무 길면 링크 대신 파일', () => expect(shareLink(mat('ja-s1', 400, 'あいうえおかきくけこさしすせそ'))).toBeNull())
  test('깨진 링크는 null', () => expect(readShare('###')).toBeNull())
  test('공유 파일 왕복', () => {
    const m = readShareFile(JSON.parse(shareFile(mat('ja-s1'))))!
    expect(m.title).toBe('대본')
    expect(readShareFile({ app: 'x' })).toBeNull()
  })
})
