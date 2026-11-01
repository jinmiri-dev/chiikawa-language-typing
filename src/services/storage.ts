/** 브라우저 저장 (프론트-설계 6장). IndexedDB 가 안 되면 메모리로 돌고 persistent:false 를 알린다. */
import { openDB } from 'idb'
import type { Lang } from '../engine/lang'
import { DEFAULT_SETTINGS, type Progress, type Settings } from '../engine/types'

const DB_NAME = 'language-grade1'
const DB_VERSION = 1
const STORES = ['materials', 'progress', 'words', 'review', 'stats', 'saved', 'settings'] as const
const KEY_PATH: Record<(typeof STORES)[number], string | undefined> = {
  materials: 'id', progress: 'materialId', words: 'id', review: 'id', stats: 'id', saved: 'id', settings: undefined,
}

export interface Store {
  persistent: boolean
  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
  getProgress(materialId: string): Promise<Progress | null>
  saveProgress(p: Progress): Promise<void>
  lastProgress(): Promise<Progress | null>
  listProgress(lang?: Lang): Promise<Progress[]>
}

/** 저장된 설정에 나중에 생긴 항목이 없으면 기본값으로 채운다 */
const withDefaults = (s?: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...s, show: { ...DEFAULT_SETTINGS.show, ...s?.show } })
const langOf = (materialId: string) => materialId.split('-')[0]
const latest = (list: Progress[]) => list.reduce<Progress | null>((a, p) => (!a || p.updatedAt > a.updatedAt ? p : a), null)

function memoryStore(): Store {
  let settings = DEFAULT_SETTINGS
  const progress = new Map<string, Progress>()
  return {
    persistent: false,
    getSettings: async () => settings,
    saveSettings: async (s) => void (settings = s),
    getProgress: async (id) => progress.get(id) ?? null,
    saveProgress: async (p) => void progress.set(p.materialId, p),
    lastProgress: async () => latest([...progress.values()]),
    listProgress: async (lang) => [...progress.values()].filter((p) => !lang || langOf(p.materialId) === lang),
  }
}

export async function openStore(): Promise<Store> {
  if (typeof indexedDB === 'undefined') return memoryStore()
  try {
    const db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        for (const name of STORES) if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, KEY_PATH[name] ? { keyPath: KEY_PATH[name] } : undefined)
      },
    })
    const all = () => db.getAll('progress') as Promise<Progress[]>
    return {
      persistent: true,
      getSettings: async () => withDefaults(await db.get('settings', 'settings')),
      saveSettings: async (s) => void (await db.put('settings', s, 'settings')),
      getProgress: async (id) => (await db.get('progress', id)) ?? null,
      saveProgress: async (p) => void (await db.put('progress', p)),
      lastProgress: async () => latest(await all()),
      listProgress: async (lang) => (await all()).filter((p) => !lang || langOf(p.materialId) === lang),
    }
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
