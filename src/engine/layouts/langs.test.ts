import { describe, expect, test } from 'vitest'
import { getLayout, keySteps, layoutsFor } from './index'
import { guideFor, guideText } from './guide'
import type { Segment } from '../types'
import { starterMaterial, starterSets } from '../../content/starter'

const seg = (text: string, reading = text, extra: Partial<Segment> = {}): Segment => ({ text, reading, isWord: true, confident: true, ...extra })
const ids = (layout: Parameters<typeof keySteps>[0], s: Segment) => keySteps(layout, s).steps.map((x) => x.keyId).join(' ')

describe('영어', () => {
  const pc = getLayout('en-qwerty')
  test('대문자는 Shift 와 함께', () => expect(ids(pc, seg('Hi'))).toBe('shift h i'))
  test('문장부호', () => expect(ids(pc, seg("I'm!"))).toBe('shift i quote m shift 1'))
  test('조합 없이 친 글자로 다음 키', () => expect(guideFor(pc, seg('Hello'), 'He').steps[guideFor(pc, seg('Hello'), 'He').nextIndex].keyId).toBe('l'))
  test('대문자 차례면 Shift 부터', () => expect(guideFor(pc, seg('Hi'), '').nextIndex).toBe(0))
  test('한 줄 안내', () => expect(guideText(pc, seg('Hello'))).toBe('Hello → Shift+H E L L O'))
  test('휴대폰 배열', () => expect(layoutsFor('en', 'mobile').map((l) => l.id)).toEqual(['en-qwerty-mobile']))
})

describe('중국어 병음', () => {
  const pc = getLayout('zh-pinyin')
  const nihao = seg('你好', 'nǐ hǎo')
  test('성조 없는 병음 + 후보 선택', () => expect(ids(pc, nihao)).toBe('n i h a o space'))
  test('ü 는 v', () => expect(ids(pc, seg('绿', 'lǜ'))).toBe('l v space'))
  test('조합 중 병음 위치(띄어쓰기·작은따옴표 무시)', () => {
    const g = guideFor(pc, nihao, "ni'h")
    expect(g.matches).toBe(true)
    expect(g.steps[g.nextIndex].keyId).toBe('a')
  })
  test('9키는 숫자 키', () => expect(ids(getLayout('zh-pinyin-9key'), nihao)).toBe('k6 k4 k4 k2 k6'))
  test('한 줄 안내', () => {
    expect(guideText(pc, nihao)).toBe('你好 → nǐ hǎo → N I H A O → Space로 후보 선택')
    expect(guideText(getLayout('zh-pinyin-9key'), nihao)).toBe('你好 → nǐ hǎo → 6 4 4 2 6 → 후보에서 你好 선택')
  })
  test('문장부호', () => expect(ids(pc, seg('？'))).toBe('shift slash'))
  test('PC·휴대폰 쿼티는 확인됨, 9키는 아직(글로만 안내)', () => {
    expect(pc.verified).toBe(true)
    expect(layoutsFor('zh', 'mobile').map((l) => [l.id, l.verified])).toEqual([['zh-pinyin-mobile', true], ['zh-pinyin-9key', false]])
  })
})

describe('대만 주음', () => {
  const pc = getLayout('tw-zhuyin-pc')
  const nihao = seg('你好', 'nǐ hǎo', { zhuyin: 'ㄋㄧˇ ㄏㄠˇ' })
  test('大千 키와 성조 키', () => expect(ids(pc, nihao)).toBe('s u 3 c l 3'))
  test('1성은 Space, 경성은 7', () => {
    expect(ids(pc, seg('他', 'tā', { zhuyin: 'ㄊㄚ' }))).toBe('w 8 space')
    expect(ids(pc, seg('嗎', 'ma', { zhuyin: '˙ㄇㄚ' }))).toBe('a 8 7')
  })
  test('조합 중 주음 위치', () => {
    const g = guideFor(pc, nihao, 'ㄋㄧˇㄏ')
    expect(g.matches).toBe(true)
    expect(g.steps[g.nextIndex].keyId).toBe('l')
  })
  test('한 줄 안내', () => expect(guideText(pc, nihao)).toBe('你好 → ㄋㄧˇ ㄏㄠˇ → S U 3 C L 3 → Enter로 확정'))
  test('휴대폰 주음은 기호 키', () => expect(ids(getLayout('tw-zhuyin-mobile'), nihao)).toBe('ㄋ ㄧ ˇ ㄏ ㄠ ˇ'))
  test('대만 배열 목록', () => {
    expect(layoutsFor('tw', 'pc').map((l) => l.id)).toEqual(['tw-zhuyin-pc', 'tw-pinyin'])
    expect(layoutsFor('tw', 'mobile').map((l) => l.id)).toEqual(['tw-zhuyin-mobile', 'tw-pinyin-mobile'])
  })
  test('대만 병음', () => expect(ids(getLayout('tw-pinyin'), nihao)).toBe('n i h a o space'))
})

describe('몽골어 키릴', () => {
  const pc = getLayout('mn-cyrillic')
  test('글자 자리(ө·ү 포함)', () => {
    expect(ids(pc, seg('сайн'))).toBe('v g a y')
    expect(ids(pc, seg('өглөө'))).toBe('f u l f f')
    expect(ids(pc, seg('үнэн'))).toBe('o y t y')
  })
  test('대문자는 Shift', () => expect(ids(pc, seg('Сайн'))).toBe('shift v g a y'))
  test('문장부호는 Windows 몽골어 자리: ? Shift+0, . Shift+6, , Shift+8', () => {
    expect(ids(pc, seg('?', '?', { isWord: false }))).toBe('shift 0')
    expect(ids(pc, seg('.', '.', { isWord: false }))).toBe('shift 6')
    expect(ids(pc, seg(',', ',', { isWord: false }))).toBe('shift 8')
  })
  test('한 줄 안내: 글자와 같은 자리의 영문 키', () => expect(guideText(pc, seg('сайн', 'сайн', { romaji: 'sain' }))).toBe('сайн (sain) → с(V) а(G) й(A) н(Y)'))
  test('PC 는 Windows 표준 배열, 휴대폰은 삼성 키보드로 확인됨', () => {
    expect(pc.verified).toBe(true)
    expect(layoutsFor('mn', 'mobile').every((l) => l.verified)).toBe(true)
    expect(layoutsFor('mn', 'mobile').map((l) => l.id)).toEqual(['mn-cyrillic-mobile'])
  })
})

test('4개 언어 기본 연습 160줄: 모든 배열에서 안내하는 키가 그 배열 그림 안에 있고 막히지 않는다', () => {
  for (const lang of ['tw', 'zh', 'en', 'mn'] as const)
    for (const layout of [...layoutsFor(lang, 'pc'), ...layoutsFor(lang, 'mobile')]) {
      const keyIds = new Set(layout.rows.flat().map((k) => k.id))
      for (const s of starterSets(lang))
        for (const line of starterMaterial(s.id)!.lines)
          for (const g of line.segments) {
            const r = keySteps(layout, g)
            expect(r.confident, `${layout.id} ${g.text}`).toBe(true)
            for (const st of r.steps) expect(keyIds.has(st.keyId), `${layout.id} ${g.text} ${st.keyId}`).toBe(true)
          }
    }
})
