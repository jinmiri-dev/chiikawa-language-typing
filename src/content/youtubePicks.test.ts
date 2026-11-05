import { expect, test } from 'vitest'
import { LANGS } from '../engine/lang'
import { YOUTUBE_PICKS } from './youtubePicks'

test('언어마다 추천 영상 30개 이상, 같은 영상 없음, 15분 안쪽, 제목에 한글 없음(한국어 소리 영상 거르기)', () => {
  for (const l of LANGS) {
    const list = YOUTUBE_PICKS[l]
    expect(list.length, l).toBeGreaterThanOrEqual(30)
    expect(new Set(list.map((v) => v.videoId)).size, l).toBe(list.length)
    for (const v of list) {
      expect(v.videoId, v.title).toMatch(/^[\w-]{11}$/)
      expect(v.durationSec, v.title).toBeLessThanOrEqual(900)
      expect(/\p{Script=Hangul}/u.test(v.title + v.channel), v.title).toBe(false)
    }
  }
})
