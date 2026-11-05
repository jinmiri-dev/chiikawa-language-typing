import { describe, expect, test } from 'vitest'
import { detectFormat, parseScript, parseTime } from './parse'

const pick = (r: ReturnType<typeof parseScript>) => r.lines.map((l) => [l.src, l.ko ?? ''])

describe('시간', () => {
  test.each([
    ['3:01', 181],
    ['1:02:03', 3723],
    ['00:03:01,000', 181],
    ['00:00:01.500', 1.5],
    ['30s', 30],
    ['안녕', undefined],
  ])('%s', (s, v) => expect(parseTime(s)).toBe(v))
})

describe('형식 판별', () => {
  test('VTT', () => expect(detectFormat('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nこんにちは')).toBe('vtt'))
  test('SRT', () => expect(detectFormat('1\n00:00:01,000 --> 00:00:02,000\nこんにちは\n')).toBe('srt'))
  test('표', () => expect(detectFormat('0:01\tこんにちは\t안녕하세요\n0:03\tありがとう\t고마워요')).toBe('table'))
  test('CSV', () => expect(detectFormat('src,ko\nこんにちは,안녕하세요\nありがとう,고마워요')).toBe('csv'))
  test('일반 글(한국어 쉼표가 있어도)', () => expect(detectFormat('うん、元気だよ。\n응, 잘 지내.\nまたね！\n또 봐!')).toBe('text'))
})

describe('나누기', () => {
  test('넷플릭스식: 한 줄에 일본어와 한국어', () =>
    expect(pick(parseScript('おはよう！ 좋은 아침!\n元気？ 잘 지내?', 'ja'))).toEqual([
      ['おはよう！', '좋은 아침!'],
      ['元気？', '잘 지내?'],
    ]))
  test('번갈아 쓰기: 일본어 줄 다음 한국어 줄', () =>
    expect(pick(parseScript('うん、元気だよ。\n응, 잘 지내.\nまたね！\n또 봐!', 'ja'))).toEqual([
      ['うん、元気だよ。', '응, 잘 지내.'],
      ['またね！', '또 봐!'],
    ]))
  test('표: 시간/원문/번역, 머리 줄은 건너뜀', () => {
    const r = parseScript('시간\t원문\t번역\n0:01\tこんにちは\t안녕하세요\n0:03\tありがとう\t고마워요', 'ja')
    expect(pick(r)).toEqual([['こんにちは', '안녕하세요'], ['ありがとう', '고마워요']])
    expect(r.lines[1].start).toBe(3)
  })
  test('이중 언어 SRT', () => {
    const r = parseScript('1\n00:00:01,000 --> 00:00:02,500\nこんにちは\n안녕하세요\n\n2\n00:00:03,000 --> 00:00:04,000\nまたね\n또 봐\n', 'ja')
    expect(pick(r)).toEqual([['こんにちは', '안녕하세요'], ['またね', '또 봐']])
    expect([r.lines[0].start, r.lines[0].end]).toEqual([1, 2.5])
  })
  test('VTT 태그 제거', () =>
    expect(pick(parseScript('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 line:90%\n<c.ja>こんにちは</c>\n', 'ja'))).toEqual([['こんにちは', '']]))
  test('원문 SRT + 한국어 SRT 를 시간으로 합친다', () => {
    const ja = '1\n00:00:01,000 --> 00:00:02,000\nこんにちは\n\n2\n00:00:05,000 --> 00:00:06,000\nまたね\n'
    const ko = '1\n00:00:05,100 --> 00:00:06,000\n또 봐\n\n2\n00:00:01,100 --> 00:00:02,000\n안녕하세요\n'
    expect(pick(parseScript(ja, 'ja', { koText: ko }))).toEqual([['こんにちは', '안녕하세요'], ['またね', '또 봐']])
  })
})

describe('정리', () => {
  test('소리 표시와 화자 이름(영어·일본어)', () => {
    const r = parseScript('[ため息] (拍手) もういいよ。 이제 됐어.\n男：待って！ 남자: 기다려!\nMAN: （笑）すごい！ 대박!', 'ja')
    expect(pick(r)).toEqual([['もういいよ。', '이제 됐어.'], ['待って！', '기다려!'], ['すごい！', '대박!']])
    expect(r.lines[0].removed).toEqual(['[ため息]', '(拍手)'])
  })
  test('대시 대사: 개수가 같으면 나눈다', () =>
    expect(pick(parseScript('-行く？ -うん。 -갈래? -응.', 'ja'))).toEqual([['行く？', '갈래?'], ['うん。', '응.']]))
  test('대시 개수가 다르면 나누지 않는다', () =>
    expect(pick(parseScript('-行く？ -うん。 갈래? 응.', 'ja'))).toEqual([['行く？ うん。', '갈래? 응.']]))
  test('소리 표시만 있는 줄은 지우고, 제목 줄은 표시', () => {
    const r = parseScript('♪～\n[雷鳴]\nNETFLIX オリジナルシリーズ\nこんにちは 안녕', 'ja')
    expect(r.lines.map((l) => l.src)).toEqual(['NETFLIX オリジナルシリーズ', 'こんにちは'])
    expect(r.lines[0].flags).toContain('title')
    expect(r.removedCount).toBe(2)
  })
  test('뜻이 없으면 확인 필요', () => {
    const r = parseScript('こんにちは\nありがとう', 'ja')
    expect(r.lines.every((l) => l.flags.includes('no-ko'))).toBe(true)
    expect(r.checkCount).toBe(2)
  })
})

describe('유튜브 스크립트 붙여넣기(무료 자막)', () => {
  const yt = '0:00\nIf you\'re happy and you know it\n0:04\nclap your hands\n0:08\n[Music]\n1:02\nstomp your feet'
  test('시간 줄과 글 줄이 번갈아 나오면 유튜브 스크립트로 읽고, 시간을 줄에 붙인다', () => {
    expect(detectFormat(yt)).toBe('youtube')
    const r = parseScript(yt, 'en')
    expect(r.lines.map((l) => [l.src, l.start, l.end])).toEqual([
      ["If you're happy and you know it", 0, 4],
      ['clap your hands', 4, 8],
      ['stomp your feet', 62, undefined],
    ])
  })
  test('한 줄에 시간과 글이 함께 있어도 읽는다', () => {
    const r = parseScript('0:01 おはよう\n0:03 元気？\n0:06 うん', 'ja')
    expect(r.lines.map((l) => [l.src, l.start])).toEqual([['おはよう', 1], ['元気？', 3], ['うん', 6]])
  })
  test('한국어 스크립트를 함께 붙이면 시간으로 짝지어 뜻을 채운다', () => {
    const r = parseScript('0:00\nおはよう\n0:03\n元気？', 'ja', { koText: '0:00\n좋은 아침\n0:03\n잘 지내?' })
    expect(r.lines.map((l) => l.ko)).toEqual(['좋은 아침', '잘 지내?'])
  })
})
