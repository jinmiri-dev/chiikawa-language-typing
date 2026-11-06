/** 재료 열기: 기본 연습(고정 자료)을 먼저 보고, 없으면 저장한 대본·복습 재료 */
import { parseLessonId } from '../content/course'
import { starterMaterial } from '../content/starter'
import { courseMaterial } from './course'
import type { Lang } from '../engine/lang'
import type { Material } from '../engine/types'
import type { Store } from './storage'

export async function getMaterial(store: Store, id: string): Promise<Material | null> {
  if (parseLessonId(id)) return courseMaterial(store, id)
  return starterMaterial(id) ?? (await store.getMaterial(id))
}

/** 대본 재료 id: `<lang>-s<시각 36진수>` (라우트 규칙 [\w-]+ 에 맞음) */
export function newScriptId(lang: Lang, now = Date.now()): string {
  return `${lang}-s${now.toString(36)}`
}
