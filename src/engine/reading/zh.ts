/** 중국어(간체)·대만어(번체) 읽기 (기획안 12장). 병음 함수는 밖에서 주입한다(pinyin-pro, 대본에서만 불러옴). */
import type { Segment } from '../types'
import { pinyinToZhuyin } from './zhuyin'

/** 글자마다 병음 배열. 한자가 아닌 글자는 그 글자를 그대로 돌려준다(pinyin-pro 와 같음) */
export type PinyinFn = (text: string, toneType: 'symbol' | 'num') => string[]

/** 대만 표준 발음이 본토와 다른 낱말(숫자 성조). 글자 수와 배열 길이가 같아야 한다. */
export const TW_FIX: Record<string, string[]> = {
  還: ['hai2'],
  星期: ['xing1', 'qi2'],
  垃圾: ['le4', 'se4'],
  頭髮: ['tou2', 'fa3'],
  期間: ['qi2', 'jian1'],
  時期: ['shi2', 'qi2'],
  企業: ['qi4', 'ye4'],
}

const HAN = /\p{Script=Han}/u
const MARKS: Record<string, string[]> = {
  a: ['a', 'ā', 'á', 'ǎ', 'à'], e: ['e', 'ē', 'é', 'ě', 'è'], i: ['i', 'ī', 'í', 'ǐ', 'ì'],
  o: ['o', 'ō', 'ó', 'ǒ', 'ò'], u: ['u', 'ū', 'ú', 'ǔ', 'ù'], ü: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
}

/** `hai2` → `hái` (a·e 먼저, ou 는 o, 그 밖은 마지막 모음) */
export function numToMark(num: string): string {
  const m = num.match(/^([a-zü]+)([0-5])$/)
  if (!m) return num
  const tone = Number(m[2]) % 5
  const s = m[1]
  const at = /[ae]/.test(s) ? s.search(/[ae]/) : s.includes('ou') ? s.indexOf('o') : Math.max(...[...'iouü'].map((v) => s.lastIndexOf(v)))
  return at < 0 || tone === 0 ? s : s.slice(0, at) + MARKS[s[at]][tone] + s.slice(at + 1)
}

/** 대만 보정: 보정표 낱말이 나오면 그 자리의 숫자 병음을 바꾼다 */
function applyTwFix(text: string, nums: string[]): string[] {
  const out = [...nums]
  for (const [word, fix] of Object.entries(TW_FIX).sort((a, b) => b[0].length - a[0].length)) {
    for (let i = text.indexOf(word); i >= 0; i = text.indexOf(word, i + word.length)) {
      const at = [...text.slice(0, i)].length
      fix.forEach((p, k) => (out[at + k] = p))
    }
  }
  return out
}

export function buildZhSegments(lang: 'zh' | 'tw', text: string, pinyin: PinyinFn): Segment[] {
  const chars = [...text]
  let nums = pinyin(text, 'num')
  if (nums.length !== chars.length) throw new Error('병음 길이가 원문과 달라요')
  if (lang === 'tw') nums = applyTwFix(text, nums)
  const marks = lang === 'tw' ? nums.map(numToMark) : pinyin(text, 'symbol')

  const segs: Segment[] = []
  let at = 0
  for (const { segment, isWordLike } of new Intl.Segmenter(lang === 'tw' ? 'zh-TW' : 'zh-CN', { granularity: 'word' }).segment(text)) {
    const n = [...segment].length
    const han = [...segment].some((c) => HAN.test(c))
    const seg: Segment = { text: segment, reading: han ? marks.slice(at, at + n).join(' ') : segment, isWord: !!isWordLike, confident: true }
    if (lang === 'tw' && han) seg.zhuyin = nums.slice(at, at + n).map(pinyinToZhuyin).join(' ')
    segs.push(seg)
    at += n
  }
  return segs
}
