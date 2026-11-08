/** 일본어 읽기 만들기 (기획안 12장). 형태소 분석 결과를 받아 조각과 히라가나 읽기로 바꾼다. 사전은 밖에서 주입한다. */
import type { Segment } from '../types'

/** kuromoji 토큰에서 쓰는 것만 */
export interface JaToken {
  surface_form: string
  pos: string
  pos_detail_1: string
  reading?: string
}

const KANJI = /\p{Script=Han}/u
const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))

/** 앞 단어에 붙여 한 단어로 칠 토큰: 활용 어미·조동사·て/で·보조 동사·접미사 */
function attaches(prev: JaToken | undefined, t: JaToken): boolean {
  if (!prev) return false
  const prevIsPredicate = prev.pos === '動詞' || prev.pos === '形容詞' || prev.pos === '助動詞'
  if (t.pos === '助動詞') return prevIsPredicate
  if (t.pos === '助詞' && t.pos_detail_1 === '接続助詞' && /^[てで]$/.test(t.surface_form)) return prevIsPredicate
  if (t.pos === '動詞' && t.pos_detail_1 === '非自立') return prevIsPredicate || prev.pos === '助詞'
  if (t.pos === '名詞' && t.pos_detail_1 === '接尾') return prev.pos === '名詞'
  return false
}

/** 읽기 규칙 판(일본어 후리가나·중국어 병음 공통): 바꾸면 저장해 둔 코스·예문 레슨을 다시 만든다. 3: 번체 병음을 간체 낱말 사전으로 */
export const READING_VERSION = 3

/** 사전이 흔히 틀리는 읽기(일상에서 쓰는 읽기로 고친다). 예: 日本 → にっぽん 이 아니라 にほん */
const READING_FIX: Record<string, string> = { 日本: 'にほん', 日本人: 'にほんじん', 日本中: 'にほんじゅう' }

function readingOf(t: JaToken): { reading: string; known: boolean } {
  const fixed = READING_FIX[t.surface_form]
  if (fixed) return { reading: fixed, known: true }
  const s = t.surface_form
  if (!KANJI.test(s)) return { reading: toHiragana(s), known: true }
  if (!t.reading || t.reading === '*') return { reading: s, known: false }
  return { reading: toHiragana(t.reading), known: true }
}

export function buildJaSegments(text: string, tokenize: (s: string) => JaToken[]): Segment[] {
  const segs: Segment[] = []
  let prev: JaToken | undefined
  for (const t of tokenize(text)) {
    const { reading, known } = readingOf(t)
    const last = segs[segs.length - 1]
    if (last && attaches(prev, t)) {
      last.text += t.surface_form
      last.reading += reading
      last.confident &&= known
    } else {
      segs.push({ text: t.surface_form, reading, isWord: t.pos !== '記号', confident: known })
    }
    prev = t
  }
  return segs
}
