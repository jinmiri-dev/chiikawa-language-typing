/** 상황별 예문·발음 연습을 연습 재료로(읽기를 만들어 저장). 내용이 바뀌면 다시 만든다 */
import { loadPractice, parsePracticeId, practiceTitle, TWISTER } from '../content/practice'
import { buildDraftMaterial } from '../engine/import/material'
import type { Material } from '../engine/types'
import { loadSegmenter } from './segmenter'
import type { Store } from './storage'

/** 발음 연습 재료는 듣기 화면이 알아보도록 이 이름을 단다 */
export const TWISTER_SOURCE = '발음 연습'

export async function practiceMaterial(store: Store, id: string): Promise<Material | null> {
  const p = parsePracticeId(id)
  if (!p) return null
  const data = await loadPractice(p.lang)
  const lines = p.id === TWISTER ? data.twisters : data.situations[p.id]
  if (!lines?.length) return null
  const saved = await store.getMaterial(id)
  if (saved && saved.lines.length === lines.length && saved.lines.every((l, i) => l.src === lines[i][0] && l.ko === lines[i][1])) return saved
  const segment = await loadSegmenter(p.lang).catch(() => null)
  const m = buildDraftMaterial({ id, lang: p.lang, title: practiceTitle(p.id), lines: lines.map(([src, ko]) => ({ src, ko, flags: [] })), segment })
  const material: Material = { ...m, kind: 'starter', koSource: 'given', ...(p.id === TWISTER ? { sourceName: TWISTER_SOURCE } : {}) }
  await store.saveMaterial(material)
  return material
}
