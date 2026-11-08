/** 대본 원문 → 조각·읽기. 무거운 것(일본어 사전, 병음 사전)은 그 언어 대본을 넣을 때만 불러온다. */
import type { Segmenter } from '../engine/import/edit'
import type { Lang } from '../engine/lang'
import { buildJaSegments } from '../engine/reading/ja'
import { buildPlainSegments } from '../engine/reading/plain'
import { buildZhSegments } from '../engine/reading/zh'
import { loadJaTokenizer } from './jaTokenizer'

/** 불러오는 동안 보여 줄 말 */
export const LOADING_TEXT: Partial<Record<Lang, string>> = {
  ja: '일본어 사전을 불러오고 있어요. 처음 한 번만 조금 걸려요(약 17MB).',
  zh: '병음 사전을 불러오고 있어요.',
  tw: '병음·주음 사전을 불러오고 있어요.',
}

/** pinyin-pro 가 문맥을 잘못 읽는 낱말(간체로 적는다. 번체도 간체로 바꿔 찾는다) */
const PINYIN_FIX: Record<string, string> = {
  中国: 'zhōng guó',
  倒吐: 'dào tǔ',
  简单地: 'jiǎn dān de',
  过得: 'guò de',
  变得: 'biàn de',
}

export async function loadSegmenter(lang: Lang): Promise<Segmenter> {
  if (lang === 'ja') {
    const tokenize = await loadJaTokenizer()
    return (src) => buildJaSegments(src, tokenize)
  }
  if (lang === 'zh' || lang === 'tw') {
    const { pinyin, customPinyin } = await import('pinyin-pro')
    // 사전이 문맥을 잘못 읽는 낱말(看中国 → kàn zhòng 이 아니라 zhōng guó 등)
    customPinyin(PINYIN_FIX)
    // 병음 사전의 낱말 읽기는 간체 기준이라, 번체는 글자마다 간체로 바꿔 찾고 자리는 그대로 둔다(時間 → shí jiān)
    let simp = (t: string) => t
    if (lang === 'tw') {
      const OpenCC = await import('opencc-js/t2cn')
      const toCn = OpenCC.Converter({ from: 'tw', to: 'cn' })
      simp = (t) => [...t].map((c) => (/\p{Script=Han}/u.test(c) ? ((s) => ([...s].length === 1 ? s : c))(toCn(c)) : c)).join('')
    }
    return (src) => buildZhSegments(lang, src, (t) => pinyin(simp(t), { type: 'array', toneType: 'num', toneSandhi: false }))
  }
  return (src) => buildPlainSegments(lang, src)
}

/**
 * 코스·예문처럼 문장이 정해진 재료: 일본어는 미리 만든 읽기를 쓴다(17MB 사전을 받지 않아 휴대폰에서도 바로 열림).
 * 한 줄이라도 없으면(문장을 바꾸고 읽기를 다시 만들지 않았으면) 사전으로 만든다.
 */
export async function segmenterFor(lang: Lang, srcs: string[]): Promise<Segmenter> {
  if (lang === 'ja') {
    const { loadJaReadings, unpackSegments } = await import('../content/readings/pack')
    const r = await loadJaReadings()
    if (srcs.every((s) => r[s])) return (src) => (r[src] ? unpackSegments(r[src]) : [])
  }
  return loadSegmenter(lang)
}
