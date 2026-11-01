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
    expect(starterSets('mn')).toEqual([])
  })
})
