/**
 * 최고 기록: 재료마다(같은 레슨을 다시 칠 때 "지난 나"와 경주) + 언어마다(가장 빠른 속도).
 * 이 브라우저에만 저장한다.
 */
import type { Lang } from '../engine/lang'
import type { Store } from './storage'

export interface MaterialBest {
  /** 분당 글자 */
  cpm: number
  accuracy: number
  /** 줄마다 걸린 시간(밀리초). 경주 상대("지난 나")의 위치를 그린다 */
  lineMs: number[]
  at: number
}
export interface LangBest {
  cpm: number
  materialId: string
  at: number
}

const mKey = (id: string) => `best:${id}`
const lKey = (lang: Lang) => `bestLang:${lang}`

export const getMaterialBest = (store: Store, id: string) => store.getMeta<MaterialBest>(mKey(id))
export const getLangBest = (store: Store, lang: Lang) => store.getMeta<LangBest>(lKey(lang))

/** 이번 기록을 견줘 더 빠르면 바꾼다. 무엇이 새로 바뀌었는지 돌려준다 */
export async function saveRun(store: Store, lang: Lang, id: string, run: MaterialBest): Promise<{ materialRecord: boolean; langRecord: boolean; prevMaterial?: MaterialBest; prevLang?: LangBest }> {
  const prevMaterial = await getMaterialBest(store, id)
  const prevLang = await getLangBest(store, lang)
  const materialRecord = run.cpm > 0 && (!prevMaterial || run.cpm > prevMaterial.cpm)
  const langRecord = run.cpm > 0 && (!prevLang || run.cpm > prevLang.cpm)
  if (materialRecord) await store.setMeta(mKey(id), run)
  if (langRecord) await store.setMeta(lKey(lang), { cpm: run.cpm, materialId: id, at: run.at })
  return { materialRecord, langRecord, ...(prevMaterial ? { prevMaterial } : {}), ...(prevLang ? { prevLang } : {}) }
}

/** "지난 나"가 elapsed 밀리초 동안 끝냈을 줄 수(소수: 줄 안에서 얼마나 갔는지까지) */
export function ghostProgress(lineMs: number[], elapsed: number): number {
  let t = 0
  for (let i = 0; i < lineMs.length; i++) {
    if (elapsed < t + lineMs[i]) return i + (elapsed - t) / Math.max(1, lineMs[i])
    t += lineMs[i]
  }
  return lineMs.length
}
