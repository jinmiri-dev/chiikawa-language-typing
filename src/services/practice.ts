/** 상황별 예문·발음 연습을 연습 재료로(읽기를 만들어 저장). 내용이 바뀌면 다시 만든다 */
import { loadPractice, parsePracticeId, practiceTitle, TWISTER } from '../content/practice'
import { READING_VERSION } from '../engine/reading/ja'
import { buildDraftMaterial } from '../engine/import/material'
import type { Material, Segment } from '../engine/types'
import { segmenterFor } from './segmenter'
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
  if (saved && saved.readingVersion === READING_VERSION && saved.lines.length === lines.length && saved.lines.every((l, i) => l.src === lines[i][0] && l.ko === lines[i][1] && (!lines[i][2] || l.segments.map((g) => g.reading).join('|') === lines[i][2]!.map(([t, r]) => r ?? t).join('|')))) return saved
  const segment = await segmenterFor(p.lang, lines.map(([src]) => src)).catch(() => null)
  const m = buildDraftMaterial({ id, lang: p.lang, title: practiceTitle(p.id), lines: lines.map(([src, ko]) => ({ src, ko, flags: [] })), segment })
  // 읽기를 정해 둔 줄은 그대로 쓴다(生米 → なまごめ 처럼 사전이 틀리는 말)
  m.lines = m.lines.map((l, i) => {
    const fixed = lines[i][2]
    if (!fixed) return l
    const segments: Segment[] = fixed.map(([text, reading]) => ({ text, reading: reading ?? text, isWord: /[^\p{P}\p{S}\s]/u.test(text), confident: true }))
    return { ...l, segments }
  })
  const material: Material = { ...m, kind: 'starter', koSource: 'given', readingVersion: READING_VERSION, ...(p.id === TWISTER ? { sourceName: TWISTER_SOURCE } : {}) }
  await store.saveMaterial(material)
  return material
}
