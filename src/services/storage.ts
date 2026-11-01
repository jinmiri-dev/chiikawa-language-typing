/** 브라우저 저장 (프론트-설계 6장). IndexedDB 가 안 되면 메모리로 돌고 persistent:false 를 알린다. */
import { openDB } from 'idb'
import type { Lang } from '../engine/lang'
import { DEFAULT_SETTINGS, type Material, type Progress, type ReviewItem, type Settings, type StatRecord, type Word } from '../engine/types'

const DB_NAME = 'language-grade1'
const DB_VERSION = 1
export const STORES = ['materials', 'progress', 'words', 'review', 'stats', 'saved', 'settings'] as const
export type StoreName = (typeof STORES)[number]
const KEY_PATH: Record<StoreName, string | undefined> = {
  materials: 'id', progress: 'materialId', words: 'id', review: 'id', stats: 'id', saved: 'id', settings: undefined,
}

/** 저장 방식(IndexedDB·메모리)에 관계없는 기본 동작 */
export interface Backend {
  get(name: StoreName, key: string): Promise<unknown>
  put(name: StoreName, value: unknown, key?: string): Promise<void>
  all(name: StoreName): Promise<unknown[]>
  delete(name: StoreName, key: string): Promise<void>
  clear(name: StoreName): Promise<void>
}

export interface Store {
  persistent: boolean
  /** 백업·복원이 쓰는 기본 동작 */
  raw: Backend
  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
  getProgress(materialId: string): Promise<Progress | null>
  saveProgress(p: Progress): Promise<void>
  lastProgress(): Promise<Progress | null>
  listProgress(lang?: Lang): Promise<Progress[]>
  getMaterial(id: string): Promise<Material | null>
  saveMaterial(m: Material): Promise<void>
  listMaterials(lang?: Lang): Promise<Material[]>
  deleteMaterial(id: string): Promise<void>
  listWords(lang?: Lang): Promise<Word[]>
  saveWord(w: Word): Promise<void>
  deleteWord(id: string): Promise<void>
  listReview(): Promise<ReviewItem[]>
  saveReview(r: ReviewItem): Promise<void>
  deleteReview(id: string): Promise<void>
  listStats(lang?: Lang): Promise<StatRecord[]>
  addStat(r: StatRecord): Promise<void>
  getMeta<T = unknown>(key: string): Promise<T | undefined>
  setMeta(key: string, value: unknown): Promise<void>
}

/** 저장된 설정에 나중에 생긴 항목이 없으면 기본값으로 채운다 */
const withDefaults = (s?: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...s, show: { ...DEFAULT_SETTINGS.show, ...s?.show } })
const langOf = (materialId: string) => materialId.split('-')[0]
const latest = (list: Progress[]) => list.reduce<Progress | null>((a, p) => (!a || p.updatedAt > a.updatedAt ? p : a), null)
const byLang = <T extends { lang: Lang }>(list: T[], lang?: Lang) => (lang ? list.filter((x) => x.lang === lang) : list)

function keyOf(name: StoreName, value: unknown, key?: string): string {
  const path = KEY_PATH[name]
  return path ? String((value as Record<string, unknown>)[path]) : key!
}

function memoryBackend(): Backend {
  const maps = new Map<StoreName, Map<string, unknown>>(STORES.map((n) => [n, new Map()]))
  return {
    get: async (n, k) => maps.get(n)!.get(k),
    put: async (n, v, k) => void maps.get(n)!.set(keyOf(n, v, k), structuredClone(v)),
    all: async (n) => [...maps.get(n)!.values()],
    delete: async (n, k) => void maps.get(n)!.delete(k),
    clear: async (n) => maps.get(n)!.clear(),
  }
}

function makeStore(raw: Backend, persistent: boolean): Store {
  const all = <T>(n: StoreName) => raw.all(n) as Promise<T[]>
  return {
    persistent,
    raw,
    getSettings: async () => withDefaults((await raw.get('settings', 'settings')) as Partial<Settings> | undefined),
    saveSettings: (s) => raw.put('settings', s, 'settings'),
    getProgress: async (id) => ((await raw.get('progress', id)) as Progress | undefined) ?? null,
    saveProgress: (p) => raw.put('progress', p),
    lastProgress: async () => latest(await all<Progress>('progress')),
    listProgress: async (lang) => (await all<Progress>('progress')).filter((p) => !lang || langOf(p.materialId) === lang),
    getMaterial: async (id) => ((await raw.get('materials', id)) as Material | undefined) ?? null,
    saveMaterial: (m) => raw.put('materials', m),
    listMaterials: async (lang) => byLang(await all<Material>('materials'), lang).sort((a, b) => b.createdAt - a.createdAt),
    deleteMaterial: (id) => raw.delete('materials', id),
    listWords: async (lang) => byLang(await all<Word>('words'), lang),
    saveWord: (w) => raw.put('words', w),
    deleteWord: (id) => raw.delete('words', id),
    listReview: () => all<ReviewItem>('review'),
    saveReview: (r) => raw.put('review', r),
    deleteReview: (id) => raw.delete('review', id),
    listStats: async (lang) => byLang(await all<StatRecord>('stats'), lang),
    addStat: (r) => raw.put('stats', r),
    getMeta: async <T,>(key: string) => (await raw.get('settings', `meta:${key}`)) as T | undefined,
    setMeta: (key, value) => raw.put('settings', value, `meta:${key}`),
  }
}

/** 저장이 안 되는 환경과 테스트용 */
export function memoryStore(): Store {
  return makeStore(memoryBackend(), false)
}

export async function openStore(): Promise<Store> {
  if (typeof indexedDB === 'undefined') return memoryStore()
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, KEY_PATH[name] ? { keyPath: KEY_PATH[name] } : undefined)
      },
    })
    const backend: Backend = {
      get: (n, k) => db.get(n, k),
      put: async (n, v, k) => void (await (KEY_PATH[n] ? db.put(n, v) : db.put(n, v, k))),
      all: (n) => db.getAll(n),
      delete: (n, k) => db.delete(n, k),
      clear: (n) => db.clear(n),
    }
    return makeStore(backend, true)
  } catch {
    return memoryStore()
  }
}

/** 브라우저가 저장소를 함부로 지우지 않게 요청한다(Safari 7일 삭제 대비) */
export async function requestPersist(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}
