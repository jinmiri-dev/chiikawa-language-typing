/** 외국인 한국어 배우기 기록: 기존 저장소의 meta 칸에 둔다(백업·복원에 함께 들어간다). */
import type { Lang } from '../engine/lang'
import type { Store } from '../services/storage'

export interface SavedSentence {
  /** `<videoId>|<시작 초>` */
  id: string
  videoId: string
  title: string
  ko: string
  /** 모국어마다 뜻(학습지를 다른 모국어로 열면 그 말 뜻을 받아 채운다) */
  meanings: Partial<Record<Lang, string>>
  start: number
  savedAt: number
}

export interface LearnWord {
  /** 조사를 뗀 낱말 */
  word: string
  /** 가사에 나온 그대로 */
  seen: string
  videoId: string
  start: number
  savedAt: number
}

const NATIVE = 'learn:native'
const SENTENCES = 'learn:sentences'
const WORDS = 'learn:words'

export const getNative = (store: Store) => store.getMeta<Lang>(NATIVE)
export const setNative = (store: Store, lang: Lang) => store.setMeta(NATIVE, lang)

export async function listSentences(store: Store): Promise<SavedSentence[]> {
  return ((await store.getMeta<SavedSentence[]>(SENTENCES)) ?? []).sort((a, b) => a.savedAt - b.savedAt)
}

/** 있으면 빼고, 없으면 담는다. 담았으면 true */
export async function toggleSentence(store: Store, s: SavedSentence): Promise<boolean> {
  const list = (await store.getMeta<SavedSentence[]>(SENTENCES)) ?? []
  const has = list.some((x) => x.id === s.id)
  await store.setMeta(SENTENCES, has ? list.filter((x) => x.id !== s.id) : [...list, s])
  return !has
}

/** 뜻을 채운 문장들을 저장 */
export async function saveSentences(store: Store, list: SavedSentence[]): Promise<void> {
  await store.setMeta(SENTENCES, list)
}

export async function removeSentence(store: Store, id: string): Promise<void> {
  const list = (await store.getMeta<SavedSentence[]>(SENTENCES)) ?? []
  await store.setMeta(SENTENCES, list.filter((x) => x.id !== id))
}

export async function listLearnWords(store: Store): Promise<LearnWord[]> {
  return (await store.getMeta<LearnWord[]>(WORDS)) ?? []
}

/** 같은 낱말은 한 번만 */
export async function addLearnWord(store: Store, w: LearnWord): Promise<void> {
  const list = await listLearnWords(store)
  if (list.some((x) => x.word === w.word)) return
  await store.setMeta(WORDS, [...list, w])
}

export async function removeLearnWord(store: Store, word: string): Promise<void> {
  await store.setMeta(WORDS, (await listLearnWords(store)).filter((x) => x.word !== word))
}
