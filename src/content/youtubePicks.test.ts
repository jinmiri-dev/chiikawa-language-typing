import { expect, test } from 'vitest'
import { LANGS } from '../engine/lang'
import { YOUTUBE_PICKS } from './youtubePicks'

// 몽골어는 시간 가사·자막이 있는 영상이 아직 적어 미리 받아 둔 것만(7개)
const MIN: Record<string, number> = { mn: 7 }

test('언어마다 추천 영상 30개(몽골어 제외), 같은 영상 없음, 15분 안쪽, 원문 출처 표시, 제목에 한글 없음', () => {
  for (const l of LANGS) {
    const list = YOUTUBE_PICKS[l]
    expect(list.length, l).toBeGreaterThanOrEqual(MIN[l] ?? 30)
    expect(new Set(list.map((v) => v.videoId)).size, l).toBe(list.length)
    for (const v of list) {
      expect(v.videoId, v.title).toMatch(/^[\w-]{11}$/)
      expect(v.durationSec, v.title).toBeLessThanOrEqual(900)
      expect(['captions', 'lyrics'], v.title).toContain(v.src)
      expect(/\p{Script=Hangul}/u.test(v.title + v.channel), v.title).toBe(false)
    }
  }
})
