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

const HANGUL = /\p{Script=Hangul}/u

/**
 * 연습 중 자동 인식: 입력기 조합 글자를 보고 실제 쓰는 자판을 고른다(확신이 없으면 null).
 * 대만어 주음 기호가 오면 주음, 로마자가 오면 병음, 일본어 로마자가 오면 로마자, 가나가 바로 오면(휴대폰) 플릭.
 */
export function layoutFromComposition(lang: Lang, device: 'pc' | 'mobile', data: string): LayoutId | null {
  const first = [...data].find((c) => c.trim())
  if (!first) return null
  const pc = device === 'pc'
  if (lang === 'tw') {
    if (BOPOMOFO.test(first)) return pc ? 'tw-zhuyin-pc' : 'tw-zhuyin-mobile'
    if (LATIN.test(first)) return pc ? 'tw-pinyin' : 'tw-pinyin-mobile'
  }
  if (lang === 'zh') {
    if (!pc && DIGIT.test(first)) return 'zh-pinyin-9key'
    if (LATIN.test(first)) return pc ? 'zh-pinyin' : 'zh-pinyin-mobile'
  }
  if (lang === 'ja') {
    if (LATIN.test(first)) return pc ? 'ja-pc-romaji' : 'ja-mobile-romaji'
    if (!pc && KANA.test(first) && data.length === 1) return 'ja-flick'
  }
  return null
}

export type KeyboardTrouble = 'korean-ime' | 'ime-off' | 'mn-latin' | 'mn-russian'

/** 지금 키보드가 그 언어가 아닌 것 같을 때 알려 줄 문구 */
const SWITCH = (device: 'pc' | 'mobile') => (device === 'pc' ? 'Win+Space(맥은 Ctrl+Space)로' : '키보드의 🌐(지구본)을 눌러')
export const TROUBLE_TEXT: Record<KeyboardTrouble, (lang: Lang, device?: 'pc' | 'mobile') => string> = {
  'korean-ime': (_l, d = 'pc') => (d === 'pc' ? '지금 한글이 쳐지고 있어요. 한/영 키를 눌러 바꿔 주세요.' : `지금 한글이 쳐지고 있어요. ${SWITCH(d)} 그 언어 키보드로 바꿔 주세요.`),
  'ime-off': (lang, d = 'pc') => `${lang === 'ja' ? '일본어' : lang === 'tw' ? '대만어(번체)' : '중국어'} 입력기가 꺼져 있는 것 같아요. ${SWITCH(d)} 입력기를 바꿔 주세요.`,
  'mn-latin': (_l, d = 'pc') => `지금 영문이 쳐지고 있어요. ${SWITCH(d)} 몽골어 키보드로 바꿔 주세요. 키보드가 없으면 이용 안내에 추가하는 법이 있어요.`,
  'mn-russian': (_l, d = 'pc') => `러시아어 키보드 같아요. 몽골어(Монгол) 키보드는 Ө·Ү 자리가 달라요. ${SWITCH(d)} 몽골어 키보드를 골라 주세요.`,
}

/**
 * 조합 없이 들어온 키 하나로 키보드 문제를 찾는다. expected 는 지금 쳐야 할 글자(그 글자를 바르게 쳤으면 문제 아님).
 * key/code 는 KeyboardEvent 의 key·code.
 */
export function keyboardTrouble(lang: Lang, ev: { key: string; code?: string; composing?: string }, expected?: string): KeyboardTrouble | null {
  if (ev.composing && HANGUL.test(ev.composing)) return 'korean-ime'
  if (ev.key.length !== 1 || ev.key === expected || (expected && /[a-z]/i.test(expected))) return null
  if (HANGUL.test(ev.key)) return 'korean-ime'
  if (lang === 'mn') {
    if (/^[a-z]$/i.test(ev.key)) return 'mn-latin'
    if ((ev.code === 'KeyR' && ev.key.toLowerCase() === 'к') || (ev.code === 'KeyT' && ev.key.toLowerCase() === 'е')) return 'mn-russian'
  }
  if ((lang === 'ja' || lang === 'zh' || lang === 'tw') && /^[a-z]$/i.test(ev.key) && !ev.composing) return 'ime-off'
  return null
}
