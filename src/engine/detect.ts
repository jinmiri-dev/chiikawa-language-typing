/** 10초 확인 (기획안 11.5): 확인 글자 하나를 칠 때 들어온 모양으로 휴대폰 배열을 추천한다.
 *  판별 규칙은 기기 검증(15장) 결과로 바꿀 수 있게 이 파일에만 둔다. 확신이 없으면 null. */
import type { Lang } from './lang'
import type { LayoutId } from './types'

const KANA = /[ぁ-ヿ]/
const BOPOMOFO = /[㄀-ㄯ]/
const LATIN = /[a-z]/i
const DIGIT = /[0-9]/

/** 확인할 때 치게 하는 글자. 없으면 확인 없이 목록에서 고른다(영어·몽골어는 자판이 하나뿐) */
export const CHECK_CHAR: Partial<Record<Lang, string>> = { ja: 'か', tw: '你', zh: '你' }

export function recommendLayout(
  lang: Lang,
  sample: { compositionSamples: string[]; keydownKeys: string[]; finalValue: string },
): LayoutId | null {
  const first = sample.compositionSamples.find((s) => s.length > 0)?.[0]
  if (lang === 'ja') {
    if (first && LATIN.test(first)) return 'ja-mobile-romaji'
    if ((first && KANA.test(first)) || KANA.test(sample.finalValue)) return 'ja-flick'
    return null
  }
  if (lang === 'tw') {
    if (first && BOPOMOFO.test(first)) return 'tw-zhuyin-mobile'
    if (first && LATIN.test(first)) return 'tw-pinyin-mobile'
    return null
  }
  if (lang === 'zh') {
    if (first && DIGIT.test(first)) return 'zh-pinyin-9key'
    if (first && LATIN.test(first)) return 'zh-pinyin-mobile'
    return null
  }
  return null
}
