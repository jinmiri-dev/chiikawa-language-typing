/** 오늘의 복습·담은 줄 다시 연습을 위한 임시 재료 만들기 */
import type { Lang } from '../engine/lang'
import { dueToday, reviewId } from '../engine/review/schedule'
import type { Line, Material, Word } from '../engine/types'
import { getMaterial } from './materials'
import type { Store } from './storage'

export const REVIEW_ID = 'review-today'

/** 오늘 볼 복습 항목들의 줄을 모아 한 재료로. 항목이 여러 언어면 가장 오래 기다린 항목의 언어만. */
export async function buildReviewMaterial(store: Store, now = Date.now()): Promise<Material | null> {
  const all = await store.listReview()
  const due = dueToday(all, now, Infinity)
  if (!due.length) return null
  const lines: Line[] = []
  let lang: Lang | null = null
  for (const item of due) {
    const m = await getMaterial(store, item.ref.materialId)
    const l = m?.lines.find((x) => x.id === item.ref.lineId)
    if (!m || !l) continue
    lang ??= m.lang
    if (m.lang !== lang) continue
    lines.push({ ...l, id: reviewId(item.ref) })
    if (lines.length >= 5) break
  }
  if (!lang || !lines.length) return null
  const material: Material = { id: REVIEW_ID, lang, kind: 'script', title: '오늘의 복습', koSource: 'given', lines, createdAt: now }
  await store.saveMaterial(material)
  // 지난 복습 진도는 지운다(매번 처음부터)
  await store.raw.delete('progress', REVIEW_ID)
  return material
}

/** 오늘 볼 복습 개수 */
export async function reviewCount(store: Store, now = Date.now()): Promise<number> {
  return dueToday(await store.listReview(), now).length
}

/** 담은 단어·줄이 나온 줄만 모아 다시 연습 (기획안 13장) */
export async function buildSavedLinesMaterial(store: Store, lang: Lang, words: Word[], now = Date.now()): Promise<Material | null> {
  const seen = new Set<string>()
  const lines: Line[] = []
  for (const w of words) {
    if (w.lang !== lang || !w.example || seen.has(w.example.src)) continue
    seen.add(w.example.src)
    lines.push({ id: `l${String(lines.length + 1).padStart(3, '0')}`, src: w.example.src, ...(w.example.ko ? { ko: w.example.ko } : {}), segments: w.example.segments })
  }
  if (!lines.length) return null
  const material: Material = { id: `${lang}-w${now.toString(36)}`, lang, kind: 'script', title: '담은 줄 다시 연습', koSource: 'given', lines, createdAt: now }
  await store.saveMaterial(material)
  return material
}
