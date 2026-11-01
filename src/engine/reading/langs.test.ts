import { describe, expect, test } from 'vitest'
import { pinyin } from 'pinyin-pro'
import { pinyinToZhuyin, toneless } from './zhuyin'
import { buildZhSegments, type PinyinFn } from './zh'
import { buildPlainSegments, mnRomaji } from './plain'

const py: PinyinFn = (text, toneType) => pinyin(text, { type: 'array', toneType })

describe('주음', () => {
  test.each([
    ['ni3', 'ㄋㄧˇ'],
    ['hao3', 'ㄏㄠˇ'],
    ['ma0', '˙ㄇㄚ'],
    ['shi4', 'ㄕˋ'],
    ['zi4', 'ㄗˋ'],
    ['ri4', 'ㄖˋ'],
    ['ju2', 'ㄐㄩˊ'],
    ['xue2', 'ㄒㄩㄝˊ'],
    ['quan2', 'ㄑㄩㄢˊ'],
    ['lü4', 'ㄌㄩˋ'],
    ['lv4', 'ㄌㄩˋ'],
    ['yi1', 'ㄧ'],
    ['you3', 'ㄧㄡˇ'],
    ['wei4', 'ㄨㄟˋ'],
    ['wen4', 'ㄨㄣˋ'],
    ['yu2', 'ㄩˊ'],
    ['yuan2', 'ㄩㄢˊ'],
    ['yong4', 'ㄩㄥˋ'],
    ['gui4', 'ㄍㄨㄟˋ'],
    ['liu4', 'ㄌㄧㄡˋ'],
    ['dun4', 'ㄉㄨㄣˋ'],
    ['zhong1', 'ㄓㄨㄥ'],
    ['er2', 'ㄦˊ'],
  ])('%s → %s', (p, z) => expect(pinyinToZhuyin(p)).toBe(z))
  test('성조 없는 병음(ü는 v)', () => {
    expect(toneless('nǐ hǎo')).toBe('nihao')
    expect(toneless('lǜ sè')).toBe('lvse')
  })
})

describe('중국어·대만어 낱말과 읽기', () => {
  test('간체: 낱말마다 성조 병음, 이으면 원문', () => {
    const s = buildZhSegments('zh', '你现在在干嘛？', py)
    expect(s.map((g) => g.text).join('')).toBe('你现在在干嘛？')
    expect(s.find((g) => g.text === '现在')?.reading).toBe('xiàn zài')
    expect(s[0].reading).toBe('nǐ')
    expect(s.at(-1)?.isWord).toBe(false)
  })
  test('대만: 주음도 함께, 還은 hái', () => {
    const s = buildZhSegments('tw', '還沒吃。', py)
    expect(s.map((g) => g.reading).join(' ')).toContain('hái méi')
    expect(s.find((g) => g.text.includes('還'))?.zhuyin).toContain('ㄏㄞˊ')
  })
  test('대만 보정표: 星期 xīngqí, 垃圾 lèsè', () => {
    expect(buildZhSegments('tw', '星期六', py).map((g) => g.reading).join(' ')).toBe('xīng qí liù')
    expect(buildZhSegments('tw', '垃圾', py)[0].reading).toBe('lè sè')
  })
})

describe('영어·몽골어', () => {
  test('영어: 낱말, 읽기는 그대로', () => {
    const s = buildPlainSegments('en', "I'm home now.")
    expect(s.map((g) => g.text).join('')).toBe("I'm home now.")
    expect(s.filter((g) => g.isWord).map((g) => g.text)).toEqual(["I'm", 'home', 'now'])
  })
  test('몽골어 전사: ө ü, х kh, ц ts', () => {
    expect(mnRomaji('Өглөөний мэнд')).toBe('Öglöönii mend')
    expect(mnRomaji('Хүүхэд')).toBe('Khüükhed')
    expect(mnRomaji('цай')).toBe('tsai')
  })
  test('몽골어 조각에 전사', () => {
    const s = buildPlainSegments('mn', 'Сайн уу?')
    expect(s.filter((g) => g.isWord).map((g) => g.romaji)).toEqual(['Sain', 'uu'])
  })
})
