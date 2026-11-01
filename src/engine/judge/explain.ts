/** 틀린 이유 (기획안 11.1). 첫 번째로 다른 글자를 보고 자주 나는 실수를 짚는다. */
import type { Lang } from '../lang'

const SMALL = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮ'
const LARGE = 'あいうえおつやゆよわアイウエオツヤユヨワ'
const KANJI = /\p{Script=Han}/u

/** 공백·문장부호로 끊긴 단어 */
function wordAround(s: string, i: number): string {
  const chars = [...s]
  let a = i
  let b = i
  while (a > 0 && !/[\p{P}\s]/u.test(chars[a - 1])) a--
  while (b < chars.length && !/[\p{P}\s]/u.test(chars[b])) b++
  return chars.slice(a, b).join('')
}

function explainJa(e: string, t: string, expected: string, typed: string, i: number): string | null {
  if (/[a-z]/i.test(t) && !/[a-z]/i.test(e)) return '일본어 입력기가 꺼져 있어요. 켜고 다시 쳐 보세요(Windows: Alt+`, Mac: Ctrl+Space).'
  const [eBase, eMark] = [...e.normalize('NFD')]
  if (eMark === '゙' && eBase === t) return '゛가 빠졌어요'
  if (eMark === '゚' && eBase === t) return '゜가 빠졌어요'
  const si = SMALL.indexOf(e)
  if (si >= 0 && LARGE[si] === t) return `작은 ${e}이에요`
  const li = LARGE.indexOf(e)
  if (li >= 0 && SMALL[li] === t) return `큰 ${e}예요`
  if (e === 'ー') return 'ー(장음)가 빠졌어요'
  if (KANJI.test(e) && KANJI.test(t)) return `다른 한자를 골랐어요: ${wordAround(expected, i)} → ${wordAround(typed, i)}`
  return null
}

/** 입력기·자판이 다른 언어로 되어 있을 때 */
function wrongInput(lang: Lang, e: string, t: string): string | null {
  const latin = (c: string) => /[a-z]/i.test(c)
  if ((lang === 'zh' || lang === 'tw') && latin(t) && /\p{Script=Han}/u.test(e))
    return `${lang === 'tw' ? '대만어(주음)' : '중국어'} 입력기가 꺼져 있어요. 켜고 다시 쳐 보세요(Windows: Win+Space).`
  if (lang === 'mn' && latin(t) && /\p{Script=Cyrillic}/u.test(e)) return '몽골어 자판이 꺼져 있어 영문이 들어가요. 자판을 바꿔 주세요(Windows: Win+Space).'
  if (lang === 'en' && /[\p{Script=Hangul}ㄱ-ㆎ]/u.test(t)) return '한글이 들어가요. 한/영 키로 영어 입력으로 바꿔 주세요.'
  return null
}

export function explainMistake(lang: Lang, expected: string, typed: string): string | null {
  const exp = [...expected]
  const got = [...typed]
  let i = 0
  while (i < exp.length && i < got.length && exp[i] === got[i]) i++
  if (i >= got.length) return null
  const e = exp[i]
  const t = got[i]
  if (e === undefined) return `${t}를 더 쳤어요`
  return (lang === 'ja' ? explainJa(e, t, expected, typed, i) : wrongInput(lang, e, t)) ?? `${e} 대신 ${t}를 쳤어요`
}
