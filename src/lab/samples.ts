import { NURSERY } from '../content/fixtures/nursery'
import type { Lang } from '../engine/lang'
import type { Script } from './inputLog'

export interface LabSample {
  id: string
  text: string
}

export const LAB_TARGET: Record<Lang, Script[]> = {
  en: ['latin'],
  ja: ['kana', 'kanji'],
  zh: ['hanzi'],
  tw: ['bopomofo', 'hanzi'],
  mn: ['cyrillic'],
}

const CHAT: Record<Lang, string[]> = {
  en: ['How are you?', 'See you tomorrow!'],
  ja: ['食べる', 'ありがとう', 'ちょっと待って'],
  zh: ['你好', '我想喝水'],
  tw: ['你好', '謝謝你', '我想喝水'],
  mn: ['Сайн байна уу', 'Өглөөний мэнд'],
}

/** 언어별 시험 예문: 짧은 채팅 문장 + 동요 대본 줄 */
export function labSamples(lang: Lang): LabSample[] {
  const chat = CHAT[lang].map((text, i) => ({ id: `${lang}-chat-${i + 1}`, text }))
  const song = NURSERY[lang].lines.map((l, i) => ({ id: `${lang}-song-${i + 1}`, text: l.src }))
  return [...chat, ...song]
}
