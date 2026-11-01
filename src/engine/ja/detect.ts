/** 10초 확인 (기획안 11.5): か 한 글자를 칠 때 들어온 모양으로 휴대폰 배열을 추천한다.
 *  판별 규칙은 기기 검증(15장) 결과로 바꿀 수 있게 이 함수에만 둔다. 확신이 없으면 null. */
import type { LayoutId } from '../types'

const KANA = /[ぁ-ヿ]/
const LATIN = /[a-z]/i

export function recommendLayout(
  _lang: 'ja',
  sample: { compositionSamples: string[]; keydownKeys: string[]; finalValue: string },
): LayoutId | null {
  const first = sample.compositionSamples.find((s) => s.length > 0)
  if (first) {
    if (LATIN.test(first[0])) return 'ja-mobile-romaji'
    if (KANA.test(first[0])) return 'ja-flick'
  }
  if (KANA.test(sample.finalValue)) return 'ja-flick'
  return null
}
