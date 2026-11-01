/** 판정 (기획안 11.1). 확정된 글자만 비교한다. */
import { romajiKeys } from '../ja/romaji'

/** 너그러운 판정에서 무시하는 글자: 문장부호·기호·공백 */
const IGNORABLE = /[\p{P}\p{S}\s]/u

/** 전각→반각, 대소문자, 굽은 따옴표를 맞춘다 */
export function normalizeLoose(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

/** 비교할 글자와 원래 위치 */
function significant(s: string, strict: boolean): { ch: string; at: number }[] {
  const out: { ch: string; at: number }[] = []
  let at = 0
  for (const raw of s) {
    const ch = strict ? raw : normalizeLoose(raw)
    if (strict || !IGNORABLE.test(ch)) out.push({ ch, at })
    at += raw.length
  }
  return out
}

export function judge(
  expected: string,
  committed: string,
  opts: { strict: boolean },
): { okUpTo: number; wrongAt?: number; done: boolean } {
  const exp = significant(expected, opts.strict)
  const got = significant(committed, opts.strict)
  let i = 0
  while (i < exp.length && i < got.length && exp[i].ch === got[i].ch) i++

  // 맞은 글자 다음 위치(사이에 낀 문장부호는 맞은 것으로 본다)
  const okUpTo = i === exp.length ? expected.length : exp[i].at
  if (i < got.length) return { okUpTo, wrongAt: i < exp.length ? exp[i].at : expected.length, done: false }
  return { okUpTo, done: i === exp.length }
}

const isKana = (c: string) => /[ぁ-ヿ]/.test(c)
function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}
function commonPrefix(a: string, b: string): number {
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i
}

/** 조합 중 글자가 기대 읽기와 맞는지 (기획안 11.2). 가나면 가나끼리, 로마자가 섞이면 로마자끼리 본다. */
export function readingProgress(expectedReading: string, composing: string): { matches: boolean; at: number } {
  const exp = toHiragana(expectedReading)
  const comp = toHiragana(composing)
  if (!/[a-z]/i.test(comp)) {
    const at = commonPrefix(exp, comp)
    return { matches: at === comp.length, at }
  }
  const kanaPart = [...comp].filter(isKana).join('')
  const latin = comp.slice(kanaPart.length).toLowerCase()
  const typed = romajiKeys(kanaPart).join('') + latin
  const target = romajiKeys(exp).join('')
  const at = commonPrefix(target, typed)
  return { matches: at === typed.length, at }
}
