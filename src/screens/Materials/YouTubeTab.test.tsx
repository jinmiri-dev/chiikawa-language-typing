import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { memoryStore, type Store } from '../../services/storage'
import * as api from '../../services/api'
import * as yt from '../../services/youtube'
import YouTubeTab from './YouTubeTab'

vi.mock('../../services/api', async (orig) => ({ ...(await orig<typeof import('../../services/api')>()), searchVideos: vi.fn(), workerOrigin: vi.fn(() => 'https://w.test') }))
vi.mock('../../services/youtube', async (orig) => ({ ...(await orig<typeof import('../../services/youtube')>()), openVideo: vi.fn() }))

const item: api.VideoItem = { videoId: 'aaaaaaaaaaa', title: '노래 영상', channel: 'Ch', durationSec: 252, thumbnail: 'https://i.ytimg.com/vi/a/mqdefault.jpg', embeddable: true }
let store: Store
beforeEach(() => {
  store = memoryStore()
  vi.mocked(api.searchVideos).mockReset().mockResolvedValue({ items: [item] })
  vi.mocked(yt.openVideo).mockReset().mockResolvedValue({ id: 'ja-yaaaaaaaaaaa' } as never)
  location.hash = '#/'
})
afterEach(cleanup)

async function open() {
  render(<AppProvider store={store}><YouTubeTab lang="ja" /></AppProvider>)
  return screen.findByLabelText('검색어나 유튜브 링크')
}

test('링크를 붙이면 검색 없이 그 영상으로', async () => {
  const input = await open()
  fireEvent.change(input, { target: { value: 'https://youtu.be/vvvvvvvvvvv' } })
  await act(async () => fireEvent.submit(input.closest('form')!))
  expect(api.searchVideos).not.toHaveBeenCalled()
  expect(yt.openVideo).toHaveBeenCalledWith(store, 'ja', 'vvvvvvvvvvv', undefined)
  expect(location.hash).toBe('#/study/ja-yaaaaaaaaaaa')
})

test('검색어와 태그', async () => {
  const input = await open()
  fireEvent.change(input, { target: { value: '歌' } })
  await act(async () => fireEvent.submit(input.closest('form')!))
  expect(api.searchVideos).toHaveBeenCalledWith('ja', { q: '歌' })
  expect(await screen.findByText('노래 영상')).toBeTruthy()
  expect(screen.getByText('4:12')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '동요' })))
  expect(api.searchVideos).toHaveBeenLastCalledWith('ja', { tag: 'kids' })
})

test('저장하면 저장한 영상에 모인다(검색 한도 안 씀)', async () => {
  const input = await open()
  fireEvent.change(input, { target: { value: '歌' } })
  await act(async () => fireEvent.submit(input.closest('form')!))
  await act(async () => fireEvent.click(await screen.findByRole('button', { name: '노래 영상 저장' })))
  expect((await store.listSaved('ja')).map((v) => v.videoId)).toEqual(['aaaaaaaaaaa'])
  vi.mocked(api.searchVideos).mockClear()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '저장한 영상 1' })))
  expect(screen.getByText('노래 영상')).toBeTruthy()
  expect(api.searchVideos).not.toHaveBeenCalled()
})

test('자막이 없으면 이유를 알린다', async () => {
  vi.mocked(yt.openVideo).mockRejectedValue(new api.ApiFailure('NO_TRACK', ''))
  const input = await open()
  fireEvent.change(input, { target: { value: 'https://youtu.be/vvvvvvvvvvv' } })
  await act(async () => fireEvent.submit(input.closest('form')!))
  expect(screen.getByText('이 영상에는 일본어 자막이 없어요')).toBeTruthy()
})

test('중계 서버가 없으면 처음부터 알린다', async () => {
  vi.mocked(api.workerOrigin).mockReturnValue(null)
  await open()
  expect(screen.getByText('유튜브 연결은 아직 준비 중이에요')).toBeTruthy()
})

test('탭을 열면 검색 없이 자막 확인된 추천 영상이 먼저 보인다', async () => {
  render(<AppProvider store={store}><YouTubeTab lang="mn" /></AppProvider>)
  expect(await screen.findByText('Маамуу - Найзууд')).toBeTruthy()
  expect(screen.getByRole('button', { name: '추천' }).getAttribute('aria-pressed')).toBe('true')
  expect(api.searchVideos).not.toHaveBeenCalled()
  await act(async () => fireEvent.click(screen.getByText('Маамуу - Найзууд').closest('button')!))
  expect(yt.openVideo).toHaveBeenCalledWith(store, 'mn', '80Mp2clgjWg', expect.objectContaining({ title: 'Маамуу - Найзууд' }))
})
