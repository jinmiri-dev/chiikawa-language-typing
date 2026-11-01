import { expect, test } from 'vitest'
import { readingOf } from './readingOf'
import type { Line } from '../../engine/types'

const line = (segments: Line['segments']): Line => ({ id: 'l001', src: segments.map((g) => g.text).join(''), segments })
const s = (text: string, reading: string, extra = {}, isWord = true) => ({ text, reading, isWord, confident: true, ...extra })

test('대만어는 주음을 낱말마다 띄워서', () =>
  expect(readingOf('tw', line([s('你', 'nǐ', { zhuyin: 'ㄋㄧˇ' }), s('還', 'hái', { zhuyin: 'ㄏㄞˊ' }), s('？', '？', {}, false)]))).toBe('ㄋㄧˇ ㄏㄞˊ'))
test('중국어는 병음을 띄워서', () => expect(readingOf('zh', line([s('你', 'nǐ'), s('好', 'hǎo')]))).toBe('nǐ hǎo'))
test('일본어는 가나를 붙여서', () => expect(readingOf('ja', line([s('今日', 'きょう'), s('は', 'は')]))).toBe('きょうは'))
