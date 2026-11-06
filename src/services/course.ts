/** 초보 코스: 레슨을 연습 재료로 만들고, 끝낸 레슨과 공부한 날(연속 학습일)을 기억한다. */
import { allLessons, lessonId, lessonLines, lessonTitle, loadCourse, parseLessonId, type CourseData } from '../content/course'
import { buildDraftMaterial } from '../engine/import/material'
import type { Lang } from '../engine/lang'
import type { Material } from '../engine/types'
import { dayKey } from '../engine/stats/trend'
import { loadSegmenter } from './segmenter'
import type { Store } from './storage'

export interface CourseProgress {
  /** 끝낸 레슨 id */
  done: string[]
  /** 레슨을 끝낸 날(YYYY-MM-DD, 중복 없음) */
  days: string[]
}

const key = (lang: Lang) => `course:${lang}`

export async function getCourseProgress(store: Store, lang: Lang): Promise<CourseProgress> {
  const p = await store.getMeta<CourseProgress>(key(lang))
  return { done: p?.done ?? [], days: p?.days ?? [] }
}

/** 레슨을 끝냈다고 적는다(같은 레슨을 다시 끝내도 한 번) */
export async function markLessonDone(store: Store, id: string, now = Date.now()): Promise<void> {
  const l = parseLessonId(id)
  if (!l) return
  const p = await getCourseProgress(store, l.lang)
  const day = dayKey(now)
  await store.setMeta(key(l.lang), {
    done: p.done.includes(id) ? p.done : [...p.done, id],
    days: p.days.includes(day) ? p.days : [...p.days, day],
  })
}

/** 오늘(또는 어제)까지 이어서 공부한 날 수. 오늘 아직 안 했어도 어제까지 이어졌으면 그 수 */
export function streak(days: string[], now = Date.now()): number {
  const set = new Set(days)
  const DAY = 86_400_000
  let t = set.has(dayKey(now)) ? now : now - DAY
  let n = 0
  while (set.has(dayKey(t))) {
    n++
    t -= DAY
  }
  return n
}

/** 다음에 할 레슨: 순서대로 처음 안 끝낸 것. 다 끝냈으면 null */
export function nextLesson(course: CourseData, lang: Lang, done: string[]): { week: number; lesson: number } | null {
  const set = new Set(done)
  return allLessons(course).find((l) => !set.has(lessonId(lang, l.week, l.lesson))) ?? null
}

/** 레슨 재료. 처음 열 때 읽기(후리가나·병음 등)를 만들어 저장해 둔다 */
export async function courseMaterial(store: Store, id: string): Promise<Material | null> {
  const l = parseLessonId(id)
  if (!l) return null
  const course = await loadCourse(l.lang)
  const lines = lessonLines(course, l.week, l.lesson)
  if (!lines) return null
  // 저장해 둔 레슨이 지금 코스와 같으면 그대로(코스가 바뀌었으면 다시 만든다)
  const saved = await store.getMaterial(id)
  const same = saved && saved.title === lessonTitle(course, l.week, l.lesson) && saved.lines.every((x, i) => x.src === lines[i]?.[0]) && saved.lines.length === lines.length
  if (saved && same) return saved
  const segment = await loadSegmenter(l.lang).catch(() => null)
  const m = buildDraftMaterial({
    id,
    lang: l.lang,
    title: lessonTitle(course, l.week, l.lesson),
    lines: lines.map(([src, ko]) => ({ src, ko, flags: [] })),
    segment,
  })
  const material: Material = { ...m, kind: 'starter', koSource: 'given' }
  await store.saveMaterial(material)
  return material
}
