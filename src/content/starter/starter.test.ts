import { describe, expect, test } from 'vitest'
import data from './ja.json'
import { starterMaterial, starterSets } from './index'

const READING = /^[ぁ-ゖー、。！？!?…〜 ]+$/
const HAS_KANJI = /\p{Script=Han}/u
const SET_IDS = ['greet', 'plan', 'react', 'bye']

describe('일본어 기본 연습', () => {
  test('4세트 × 10줄, 세트 순서', () => {
    expect(data.sets.map((s) => s.id)).toEqual(SET_IDS)
    for (const s of data.sets) expect(s.lines).toHaveLength(10)
  })

  test('조각을 이으면 원문, 읽기는 히라가나, 한자 조각엔 읽기, 뜻 있음', () => {
    for (const s of SET_IDS) {
      const m = starterMaterial(`ja-${s}`)!
      m.lines.forEach((line, i) => {
        expect(line.id).toBe(`${s}-${String(i + 1).padStart(2, '0')}`)
        expect(line.segments.map((g) => g.text).join('')).toBe(line.src)
        expect(line.ko?.trim()).toBeTruthy()
        for (const g of line.segments) {
          expect(g.reading, `${line.id} ${g.text}`).toMatch(READING)
          if (HAS_KANJI.test(g.text)) expect(g.reading).not.toBe(g.text)
        }
      })
    }
  })

  test('줄 길이 4~16자', () => {
    for (const s of SET_IDS)
      for (const line of starterMaterial(`ja-${s}`)!.lines) {
        expect([...line.src].length, line.src).toBeGreaterThanOrEqual(4)
        expect([...line.src].length, line.src).toBeLessThanOrEqual(16)
      }
  })

  test('재료 모양', () => {
    const m = starterMaterial('ja-plan')!
    expect(m).toMatchObject({ id: 'ja-plan', lang: 'ja', kind: 'starter', title: '약속 잡기', koSource: 'given' })
    expect(m.lines[0].segments[0].confident).toBe(true)
    expect(starterMaterial('ja-nope')).toBeNull()
  })

  test('세트 목록', () => {
    const sets = starterSets('ja')
    expect(sets.map((s) => s.title)).toEqual(['인사와 대답', '약속 잡기', '리액션', '마무리 인사'])
    expect(sets[0]).toMatchObject({ id: 'ja-greet', lang: 'ja', lines: 10, reviewed: false })
    expect(starterSets('mn')).toHaveLength(4)
  })
})

describe('다른 언어 기본 연습', () => {
  const jaKo = data.sets.flatMap((s) => s.lines.map((l) => l.ko))
  const TRAD_ONLY = /[這們麼說嗎還沒間見來會對車點歡關聯謝夢訂廳厲幾開幫話]/
  const SIMP_ONLY = /[这们么说吗还没间见来会对车点欢关联谢梦订厅厉几开帮话]/
  for (const lang of ['tw', 'zh', 'en', 'mn'] as const) {
    test(`${lang}: 4세트 × 10줄, 뜻은 일본어 세트와 같다, 조각을 이으면 원문`, () => {
      const sets = starterSets(lang)
      expect(sets.map((s) => s.title)).toEqual(['인사와 대답', '약속 잡기', '리액션', '마무리 인사'])
      const lines = sets.flatMap((s) => starterMaterial(s.id)!.lines)
      expect(lines).toHaveLength(40)
      expect(lines.map((l) => l.ko)).toEqual(jaKo)
      for (const l of lines) expect(l.segments.map((g) => g.text).join('')).toBe(l.src)
    })
  }
  test('대만어는 번체만, 중국어는 간체만', () => {
    const src = (lang: 'tw' | 'zh') => starterSets(lang).flatMap((s) => starterMaterial(s.id)!.lines.map((l) => l.src)).join('')
    expect(src('tw')).not.toMatch(SIMP_ONLY)
    expect(src('zh')).not.toMatch(TRAD_ONLY)
  })
  test('대만어 한자 조각에는 주음, 몽골어 낱말에는 전사', () => {
    for (const l of starterMaterial('tw-greet')!.lines) for (const g of l.segments) if (/\p{Script=Han}/u.test(g.text)) expect(g.zhuyin).toBeTruthy()
    const mn = starterSets('mn').flatMap((s) => starterMaterial(s.id)!.lines)
    expect(mn.map((l) => l.src).join('')).toMatch(/[өү]/)
    for (const l of mn) for (const g of l.segments) if (g.isWord) expect(g.romaji).toBeTruthy()
  })
})
