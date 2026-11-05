/** 판정 (기획안 11.1). 확정된 글자만 비교한다. */
import { romajiKeys } from '../ja/romaji'

/** 너그러운 판정에서 무시하는 글자: 문장부호·기호·공백 */
const IGNORABLE = /[\p{P}\p{S}\s]/u

/** 전각→반각, 대소문자, 굽은 따옴표를 맞춘다 */
export function normalizeLoose(s: string): string {
  return s.normalize('NFKC').toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
}

/** 띄어쓰기·문장부호까지 볼 때: 전각→반각, 굽은 따옴표만 맞춘다(대소문자는 그대로) */
const normalizeFull = (s: string) => s.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')

/**
 * 비교할 글자와 원래 위치.
 * strict(기본): 띄어쓰기·문장부호도 친다. 띄어쓰기 여러 칸은 한 칸, skip 은 그 키보드로 칠 수 없어 건너뛰는 글자.
 * 아니면(쉽게): 문장부호·기호·공백을 빼고 대소문자도 보지 않는다.
 */
function significant(s: string, strict: boolean, skip?: RegExp): { ch: string; at: number }[] {
  const out: { ch: string; at: number }[] = []
  let at = 0
  for (const raw of s) {
    const ch = strict ? normalizeFull(raw) : normalizeLoose(raw)
    const space = /\s/.test(ch)
    const keep = strict ? !(skip?.test(ch)) && !(space && (out.length === 0 || /\s/.test(out[out.length - 1].ch))) : !IGNORABLE.test(ch)
    if (keep) out.push({ ch: space ? ' ' : ch, at })
    at += raw.length
  }
  return out
}

/** 비교하는 글자만(너그러우면 문장부호·공백을 빼고 맞춘 글자) */
export function significantChars(s: string, strict: boolean, skip?: RegExp): string[] {
  return significant(s, strict, skip).map((x) => x.ch)
}

export function judge(
  expected: string,
  committed: string,
  opts: { strict: boolean; skip?: RegExp },
): { okUpTo: number; wrongAt?: number; done: boolean } {
  const exp = significant(expected, opts.strict, opts.skip)
  const got = significant(committed, opts.strict, opts.skip)
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

/**
 * 입력기로 조합 중인(아직 확정 안 한) 글자가 원문과 몇 글자 맞는지. 문장 강조가 확정만 기다리지 않고 따라가게.
 * 끝에 남은 로마자(가나로 바뀌기 전)는 빼고, 원문 글자와 그대로 같은 것만 센다(한자 읽기·병음·주음은 0).
 */
export function composingAhead(expected: string, okUpTo: number, composing: string): number {
  const typed = [...composing.replace(/[A-Za-z]+$/, '')]
  const rest = [...expected.slice(okUpTo)]
  let n = 0
  while (n < typed.length && n < rest.length && typed[n].normalize('NFKC') === rest[n].normalize('NFKC')) n++
  return rest.slice(0, n).join('').length
}
