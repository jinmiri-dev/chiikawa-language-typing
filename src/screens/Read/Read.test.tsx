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

test('발음 연습: 3번씩 듣기를 켜면 한 문장을 세 번 들려주고, 뒤로 가기는 초보 코스로', async () => {
  vi.mocked(speak).mockClear()
  render(<AppProvider store={store}><Read materialId="en-ptwister" /></AppProvider>)
  await screen.findByText('그녀는 바닷가에서 조개껍데기를 판다.')
  expect(screen.getByRole('link', { name: '뒤로' }).getAttribute('href')).toContain('tab=course')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '3번씩 듣기' })))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '1번째 문장 듣기' })))
  await waitFor(() => expect(vi.mocked(speak)).toHaveBeenCalledTimes(3), { timeout: 3000 })
  expect(vi.mocked(speak).mock.calls.every((c) => c[0] === 'She sells seashells by the seashore.')).toBe(true)
})

test('따라 말하기: 🎤를 누르고 말하면 원문과 얼마나 같은지 보여 준다', async () => {
  class FakeRec {
    lang = ''
    interimResults = false
    maxAlternatives = 1
    onresult: ((e: unknown) => void) | null = null
    onerror: (() => void) | null = null
    onend: (() => void) | null = null
    start() {
      setTimeout(() => {
        this.onresult?.({ results: [[{ transcript: 'it stops' }]] })
        this.onend?.()
      }, 0)
    }
    stop() {}
  }
  vi.stubGlobal('webkitSpeechRecognition', FakeRec)
  render(<AppProvider store={store}><Read materialId="en-nabc" /></AppProvider>)
  await screen.findByText('폭우')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '2번째 문장 따라 말하기' })))
  await waitFor(() => expect(screen.getByText(/일치 100%/)).toBeTruthy())
  vi.unstubAllGlobals()
})
