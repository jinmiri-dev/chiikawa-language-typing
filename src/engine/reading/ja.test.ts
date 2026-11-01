// @vitest-environment node
import { beforeAll, expect, test } from 'vitest'
import kuromoji from 'kuromoji'
import { buildJaSegments, type JaToken } from './ja'
import { buildDraftMaterial } from '../import/material'

let tokenize: (s: string) => JaToken[]
beforeAll(
  () =>
    new Promise<void>((resolve, reject) =>
      kuromoji.builder({ dicPath: 'node_modules/kuromoji/dict' }).build((err, t) => {
        if (err) return reject(err)
        tokenize = (s) => t.tokenize(s)
        resolve()
      }),
    ),
  30_000,
)

const view = (text: string) => buildJaSegments(text, tokenize).map((g) => `${g.text}(${g.reading})`).join(' ')

test('활용은 한 단어로', () => expect(view('食べた？')).toBe('食べた(たべた) ？(？)'))
test('조사는 따로, 읽기는 히라가나', () => expect(view('今日は楽しかった！')).toBe('今日(きょう) は(は) 楽しかった(たのしかった) ！(！)'))
test('て形과 보조 동사', () => expect(view('食べてない。')).toBe('食べてない(たべてない) 。(。)'))
test('가타카나 낱말의 읽기는 히라가나', () => expect(view('カフェに行きたいな。')).toBe('カフェ(かふぇ) に(に) 行きたい(いきたい) な(な) 。(。)'))
test('조각을 이으면 원문', () => {
  const s = '気をつけて帰ってね。'
  expect(buildJaSegments(s, tokenize).map((g) => g.text).join('')).toBe(s)
})
test('문장부호는 단어가 아님', () => expect(buildJaSegments('うん。', tokenize).at(-1)?.isWord).toBe(false))
test('읽기를 모르는 한자는 확신 없음', () => {
  const fake = () => [{ surface_form: '鬱', pos: '名詞', pos_detail_1: '一般', reading: undefined }] as JaToken[]
  expect(buildJaSegments('鬱', fake)[0]).toMatchObject({ text: '鬱', confident: false })
})

test('사전이 없으면 줄마다 읽기 확인 필요로 두고 계속', () => {
  const m = buildDraftMaterial({ id: 'ja-s1', lang: 'ja', title: 't', lines: [{ src: '元気？', ko: '잘 지내?', flags: [] }], segment: null })
  expect(m.lines[0].segments).toEqual([{ text: '元気？', reading: '元気？', isWord: true, confident: false }])
  expect(m.lines[0].needsCheck).toEqual(['reading'])
})

test('초안으로 재료 만들기', () => {
  const m = buildDraftMaterial({ id: 'ja-s1', lang: 'ja', title: '대본', lines: [{ src: '元気？', ko: '잘 지내?', start: 3, flags: [] }, { src: 'またね', flags: ['no-ko'] }], segment: (s) => buildJaSegments(s, tokenize) })
  expect(m).toMatchObject({ id: 'ja-s1', kind: 'script', koSource: 'given', title: '대본' })
  expect(m.lines.map((l) => l.id)).toEqual(['l001', 'l002'])
  expect(m.lines[0]).toMatchObject({ src: '元気？', ko: '잘 지내?', start: 3 })
  expect(m.lines[1].needsCheck).toEqual(['ko'])
})
