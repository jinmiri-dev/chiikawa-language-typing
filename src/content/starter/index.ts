import type { Lang } from '../../engine/lang'
import type { Material, Segment } from '../../engine/types'
import ja from './ja.json'

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

const FILES: Partial<Record<Lang, StarterFile>> = { ja }

/** 문장부호·공백만 있는 조각은 단어가 아니다 */
const isWord = (text: string) => /[^\p{P}\p{S}\s]/u.test(text)

function toSegment([text, reading]: string[]): Segment {
  return { text, reading: reading ?? text, isWord: isWord(text), confident: true }
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
