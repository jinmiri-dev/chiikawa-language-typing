import { expect, test } from 'vitest'
import { pairTexts, titleFrom, youtubeIdFrom } from './files'

test('제목: 파일 이름이나 첫 줄', () => {
  expect(titleFrom({ fileName: 'First Love E01.ja-ko.srt' })).toBe('First Love E01.ja-ko')
  expect(titleFrom({ text: '\n  おはよう！ 좋은 아침!\nまたね' })).toBe('おはよう！ 좋은 아침!')
  expect(titleFrom({ text: 'あ'.repeat(40) })).toBe('あ'.repeat(24) + '…')
  expect(titleFrom({})).toBe('내 대본')
})

test('유튜브 링크에서 영상 id', () => {
  expect(youtubeIdFrom('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s')).toBe('dQw4w9WgXcQ')
  expect(youtubeIdFrom('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  expect(youtubeIdFrom('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  expect(youtubeIdFrom('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined()
  expect(youtubeIdFrom('')).toBeUndefined()
})

test('파일 두 개면 한국어 쪽을 뜻으로', () => {
  expect(pairTexts(['안녕하세요\n또 봐', 'こんにちは\nまたね'], 'ja')).toEqual({ text: 'こんにちは\nまたね', koText: '안녕하세요\n또 봐' })
  expect(pairTexts(['こんにちは'], 'ja')).toEqual({ text: 'こんにちは' })
})
