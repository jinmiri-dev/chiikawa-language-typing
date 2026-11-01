import type { Lang } from '../../engine/lang'
import type { Material, Segment } from '../../engine/types'
import en from './en.json'
import ja from './ja.json'
import mn from './mn.json'
import tw from './tw.json'
import zh from './zh.json'

/** 기본 연습 세트 파일 모양 (기획안 20.3) */
interface StarterFile {
  reviewed: boolean
  sets: { id: string; title: string; lines: { ko: string; segs: string[][] }[] }[]
}

export interface StarterSet {
  /** 재료 id: `<lang>-<setId>` */
  id: string
  lang: Lang
  title: string
  minutes: number
  reviewed: boolean
  lines: number
}

const FILES: Record<Lang, StarterFile> = { ja, tw, zh, en, mn }

/** 문장부호·공백만 있는 조각은 단어가 아니다 */
const isWord = (text: string) => /[^\p{P}\p{S}\s]/u.test(text)

/** [원문, 읽기?, 주음?, 전사?] (빈 칸은 없음) */
function toSegment([text, reading, zhuyin, romaji]: string[]): Segment {
  return {
    text,
    reading: reading || text,
    ...(zhuyin ? { zhuyin } : {}),
    ...(romaji ? { romaji } : {}),
    isWord: isWord(text),
    confident: true,
  }
}

export function starterSets(lang: Lang): StarterSet[] {
  const file = FILES[lang]
  if (!file) return []
  return file.sets.map((s) => ({
    id: `${lang}-${s.id}`,
    lang,
    title: s.title,
    minutes: 3,
    reviewed: file.reviewed,
    lines: s.lines.length,
  }))
}

export function starterMaterial(id: string): Material | null {
  const [lang, setId] = id.split('-') as [Lang, string]
  const set = FILES[lang]?.sets.find((s) => s.id === setId)
  if (!set) return null
  return {
    id,
    lang,
    kind: 'starter',
    title: set.title,
    koSource: 'given',
    createdAt: 0,
    lines: set.lines.map((l, i) => {
      const segments = l.segs.map(toSegment)
      return {
        id: `${setId}-${String(i + 1).padStart(2, '0')}`,
        src: segments.map((g) => g.text).join(''),
        ko: l.ko,
        segments,
      }
    }),
  }
}
