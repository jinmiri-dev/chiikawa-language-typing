import { describe, expect, test } from 'vitest'
import { NURSERY } from './nursery'
import { LANGS } from '../../engine/lang'

const KANA = /[぀-ヿ]/
const HAN = /\p{Script=Han}/u
const CYRILLIC = /\p{Script=Cyrillic}/u
// 간체에만 있는 글자 / 번체에만 있는 글자 (两只老虎 기준)
const SIMPLIFIED_ONLY = /[两只没]/
const TRADITIONAL_ONLY = /[兩隻]/

describe('5개 언어 동요 대본 자료', () => {
  test('5개 언어가 모두 있다', () => {
    expect(Object.keys(NURSERY).sort()).toEqual([...LANGS].sort())
  })

  test.each(LANGS)('%s: 4줄 이상, 줄마다 원문과 한국어 뜻이 있다', (lang) => {
    const s = NURSERY[lang]
    expect(s.lines.length).toBeGreaterThanOrEqual(4)
    for (const line of s.lines) {
      expect(line.src.trim()).not.toBe('')
      expect(line.ko.trim()).not.toBe('')
      expect(line.ko).toMatch(/[가-힣]/)
    }
  })

  test('영어는 라틴 문자만', () => {
    for (const l of NURSERY.en.lines) expect(l.src).toMatch(/^[A-Za-z ,.'!?-]+$/)
  })
  test('일본어는 가나가 들어 있다', () => {
    expect(NURSERY.ja.lines.every((l) => KANA.test(l.src))).toBe(true)
  })
  test('중국어(간체)는 한자이고 간체 글자가 있고 번체 글자가 없다', () => {
    const all = NURSERY.zh.lines.map((l) => l.src).join('')
    expect(HAN.test(all)).toBe(true)
    expect(SIMPLIFIED_ONLY.test(all)).toBe(true)
    expect(TRADITIONAL_ONLY.test(all)).toBe(false)
  })
  test('대만어(번체)는 번체 글자가 있고 간체 전용 글자가 없다', () => {
    const all = NURSERY.tw.lines.map((l) => l.src).join('')
    expect(TRADITIONAL_ONLY.test(all)).toBe(true)
    expect(SIMPLIFIED_ONLY.test(all)).toBe(false)
  })
  test('몽골어는 키릴 문자이고 몽골어 전용 글자(ө, ү)가 들어 있다', () => {
    const all = NURSERY.mn.lines.map((l) => l.src).join('')
    expect(CYRILLIC.test(all)).toBe(true)
    expect(/[өүӨҮ]/.test(all)).toBe(true)
  })
})
