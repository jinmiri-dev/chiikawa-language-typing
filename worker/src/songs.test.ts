import { describe, expect, test } from 'vitest'
import { findSource } from './transcript'
import { findSong, parseLrc, scriptFits, songQuery, toScript } from './songs'
import { fakeFetch, json, testEnv } from './testing'

const LRC = '[00:01.00] 無敵の笑顔で荒らすメディア\n[00:03.50] 知りたいその秘密ミステリアス\n[00:06.00]\n[00:08.00] 完璧で嘘つきな君は\n[00:11.00] 天才的なアイドル様'
const hit = (o: object) => ({ trackName: 'アイドル', artistName: 'YOASOBI', duration: 213, syncedLyrics: LRC, ...o })
const meta = { title: 'YOASOBI「アイドル」 Official Music Video', channel: 'Ayase / YOASOBI', durationSec: 225, embeddable: true, music: true }
const deps = (list: unknown) => ({ fetch: fakeFetch([['lrclib.net', () => json(list)]]), now: () => 0 })

describe('노래 가사(무료)', () => {
  test('LRC 를 줄로: 빈 줄은 끝 시간으로만', () => {
    const c = parseLrc(LRC)
    expect(c.map((x) => [x.text, x.start, x.end])).toEqual([
      ['無敵の笑顔で荒らすメディア', 1, 3.5],
      ['知りたいその秘密ミステリアス', 3.5, 6],
      ['完璧で嘘つきな君は', 8, 11],
      ['天才的なアイドル様', 11, 17],
    ])
  })
  test('제목에서 공식 영상·가사 같은 말을 지운다', () => {
    expect(songQuery(meta.title, 'YOASOBI')[0]).toBe('YOASOBI アイドル')
    expect(songQuery('黃昏 - 周傳雄 - 『超高无损音質』【動態歌詞Lyrics】', 'POP')[0]).toBe('黃昏 周傳雄')
    expect(songQuery('tuki.『晩餐歌』Music Video', 'tuki.')[0]).toBe('tuki. 晩餐歌')
  })
  test('중국어 가사는 간체·번체를 배울 말에 맞춰 바꾼다', () => {
    expect(scriptFits('我們這樣說時', 'zh')).toBe(true)
    expect(toScript('zh', '我們這樣說')).toBe('我们这样说')
    expect(toScript('tw', '我们这样说')).toBe('我們這樣說')
  })
  test('이름·길이·글자가 맞는 것 중 길이가 가장 가까운 가사', async () => {
    const c = await findSong(deps([hit({ duration: 330 }), hit({ trackName: '夜に駆ける' }), hit({ duration: 224, syncedLyrics: LRC.replace('[00:01.00]', '[00:02.00]') })]), meta, 'ja')
    expect(c?.[0].start).toBe(2)
  })
  test('맞는 가사가 없으면 null', async () => {
    expect(await findSong(deps([hit({ syncedLyrics: '[00:01.00] hello\n[00:02.00] a\n[00:03.00] b\n[00:04.00] c' })]), meta, 'ja')).toBeNull()
  })
  test('자막 서비스가 멈춰도 노래는 가사로 연습한다', async () => {
    const env = testEnv()
    const d = { fetch: fakeFetch([['lrclib.net', () => json([hit({})])], ['searchapi.io', () => new Response('', { status: 429 })]]), now: () => 0 }
    const got = await findSource(env, d, 'ZRQzKBlHgtc', 'ja', { ...meta, music: false, title: 'YOASOBI アイドル' })
    expect(got.via).toBe('lyrics')
  })
  test('노래가 아니고 자막 서비스도 멈추면 붙여넣기를 안내한다', async () => {
    const env = testEnv()
    const d = { fetch: fakeFetch([['lrclib.net', () => json([])], ['searchapi.io', () => new Response('', { status: 429 })]]), now: () => 0 }
    await expect(findSource(env, d, 'ZRQzKBlHgtc', 'ja', { ...meta, music: false, title: 'ニュース' })).rejects.toThrow(/스크립트 표시/)
  })
})
