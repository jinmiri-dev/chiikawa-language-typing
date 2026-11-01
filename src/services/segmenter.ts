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

export async function loadSegmenter(lang: Lang): Promise<Segmenter> {
  if (lang === 'ja') {
    const tokenize = await loadJaTokenizer()
    return (src) => buildJaSegments(src, tokenize)
  }
  if (lang === 'zh' || lang === 'tw') {
    const { pinyin } = await import('pinyin-pro')
    return (src) => buildZhSegments(lang, src, (t) => pinyin(t, { type: 'array', toneType: 'num', toneSandhi: false }))
  }
  return (src) => buildPlainSegments(lang, src)
}
