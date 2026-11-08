import { describe, expect, test } from 'vitest'
import { LANGS } from '../../engine/lang'
import { loadPractice, parsePracticeId, practiceId, SITUATIONS, TWISTER } from '.'

const SCRIPT: Record<string, RegExp> = { ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, zh: /\p{Script=Han}/u, tw: /\p{Script=Han}/u, en: /[A-Za-z]/, mn: /[Ѐ-ӿ]/ }

describe('상황별 예문·발음 연습', () => {
  test.each(LANGS)('%s: 상황 8개 × 8줄, 발음 연습 8줄, 원문은 그 언어 글자·뜻은 한국어', async (lang) => {
    const d = await loadPractice(lang)
    expect(Object.keys(d.situations).sort()).toEqual(SITUATIONS.map((s) => s.id).sort())
    for (const lines of [...Object.values(d.situations), d.twisters]) {
      expect(lines).toHaveLength(8)
      for (const [src, ko] of lines) {
        expect(src.trim()).toBe(src)
        expect(SCRIPT[lang].test(src)).toBe(true)
        expect(/[가-힣]/.test(src)).toBe(false)
        expect(/[가-힣]/.test(ko)).toBe(true)
      }
    }
    // 같은 상황 안에서 같은 문장이 두 번 나오지 않는다
    for (const lines of Object.values(d.situations)) expect(new Set(lines.map(([s]) => s)).size).toBe(lines.length)
  })
  test('재료 id', () => {
    expect(parsePracticeId(practiceId('ja', 'email'))).toEqual({ lang: 'ja', id: 'email' })
    expect(parsePracticeId(practiceId('mn', TWISTER))).toEqual({ lang: 'mn', id: TWISTER })
    expect(parsePracticeId('ja-phone')).toBeNull()
    expect(parsePracticeId('ja-pnope')).toBeNull()
  })
})
