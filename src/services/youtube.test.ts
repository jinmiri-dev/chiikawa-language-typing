import { beforeEach, expect, test, vi } from 'vitest'
import { memoryStore } from './storage'
import { openVideo, videoMaterialId } from './youtube'
import * as api from './api'

vi.mock('./api', async (orig) => ({ ...(await orig<typeof import('./api')>()), getTranscript: vi.fn() }))
vi.mock('./segmenter', () => ({ loadSegmenter: async () => (src: string) => [{ text: src, reading: src, isWord: true, confident: true }] }))

beforeEach(() => vi.mocked(api.getTranscript).mockReset())

const transcript: api.TranscriptResult = {
  videoId: 'vvvvvvvvvvv', lang: 'ja', source: 'manual', koSource: 'auto',
  lines: [
    { start: 1, end: 3, src: '[拍手] こんにちは', ko: '안녕하세요' },
    { start: 4, end: 6, src: '♪～' },
    { start: 7, end: 9, src: 'またね', ko: '또 봐' },
  ],
}

test('자막 → 재료: 소리 표시 정리, 시간, 자동 번역 표시', async () => {
  vi.mocked(api.getTranscript).mockResolvedValue(transcript)
  const store = memoryStore()
  const m = await openVideo(store, 'ja', 'vvvvvvvvvvv', { title: '영상', channel: 'Ch', durationSec: 60, thumbnail: 't' })
  expect(m).toMatchObject({ id: videoMaterialId('ja', 'vvvvvvvvvvv'), kind: 'youtube', youtubeId: 'vvvvvvvvvvv', koSource: 'auto', title: '영상' })
  expect(m.lines.map((l) => [l.src, l.ko, l.start, l.end])).toEqual([['こんにちは', '안녕하세요', 1, 3], ['またね', '또 봐', 7, 9]])
  expect(await store.getMaterial(m.id)).not.toBeNull()
})

test('한 번 연 영상은 다시 자막을 받지 않는다(한도 안 씀)', async () => {
  vi.mocked(api.getTranscript).mockResolvedValue(transcript)
  const store = memoryStore()
  await openVideo(store, 'ja', 'vvvvvvvvvvv')
  await openVideo(store, 'ja', 'vvvvvvvvvvv')
  expect(api.getTranscript).toHaveBeenCalledTimes(1)
})

test('저장한 영상', async () => {
  const s = memoryStore()
  await s.saveVideo({ id: 'ja:vvvvvvvvvvv', lang: 'ja', videoId: 'vvvvvvvvvvv', title: 'T', channel: 'C', thumbnail: 't', durationSec: 9, savedAt: 1 })
  expect((await s.listSaved('ja')).map((v) => v.videoId)).toEqual(['vvvvvvvvvvv'])
  expect(await s.listSaved('mn')).toEqual([])
  await s.deleteSaved('ja:vvvvvvvvvvv')
  expect(await s.listSaved()).toEqual([])
})
