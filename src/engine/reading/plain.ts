/** 영어·몽골어: 읽기는 원문 그대로(키릴·라틴 글자를 바로 친다). 몽골어는 로마자 전사를 함께 보여 준다. */
import type { Segment } from '../types'

/** 몽골어 키릴 → 로마자(MNS 5217 에 가깝게, 한국 학습자가 읽기 쉬운 표기) */
const MN: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'ye', ё: 'yo', ж: 'j', з: 'z', и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', ө: 'ö', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ү: 'ü', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
}

export function mnRomaji(text: string): string {
  return [...text]
    .map((c) => {
      const low = c.toLowerCase()
      const r = MN[low]
      if (r === undefined) return c
      return c !== low && r ? r[0].toUpperCase() + r.slice(1) : r
    })
    .join('')
}

export function buildPlainSegments(lang: 'en' | 'mn', text: string): Segment[] {
  return [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)].map(({ segment, isWordLike }) => ({
    text: segment,
    reading: segment,
    ...(lang === 'mn' && isWordLike ? { romaji: mnRomaji(segment) } : {}),
    isWord: !!isWordLike,
    confident: true,
  }))
}
