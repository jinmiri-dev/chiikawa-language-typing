import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { speak } from '../../services/speech'
import { memoryStore, type Store } from '../../services/storage'
import Read from './Read'

vi.mock('../../services/speech', async (orig) => ({ ...(await orig<typeof import('../../services/speech')>()), speak: vi.fn(async () => ({ source: 'device' as const })), stopSpeaking: vi.fn() }))
vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  getGloss: vi.fn(async () => [[['rain', '비']]]),
}))

let store: Store
beforeEach(async () => {
  store = memoryStore()
  const seg = (text: string, isWord = true) => ({ text, isWord, confident: true })
  await store.saveMaterial({
    id: 'en-nabc', lang: 'en', kind: 'script', title: 'Rain', koSource: 'auto', link: 'https://x', sourceName: 'BBC News', createdAt: 0,
    lines: [
      { id: 'l1', src: 'Heavy rain', ko: '폭우', segments: [seg('Heavy'), seg(' ', false), seg('rain')] },
      { id: 'l2', src: 'It stops.', ko: '그친다.', segments: [seg('It'), seg(' ', false), seg('stops'), seg('.', false)] },
    ],
  })
})
afterEach(cleanup)

test('뉴스 듣기: 문장을 누르면 그 문장을 읽고, 낱말을 누르면 뜻과 담기가 나온다', async () => {
  render(<AppProvider store={store}><Read materialId="en-nabc" /></AppProvider>)
  await screen.findByText('폭우')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '2번째 문장 듣기' })))
  expect(vi.mocked(speak).mock.calls.at(-1)?.[0]).toBe('It stops.')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'rain' })))
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('비'))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '☆ 단어장에 담기' })))
  expect((await store.listWords('en')).map((w) => [w.text, w.meaning])).toEqual([['rain', '비']])
})
