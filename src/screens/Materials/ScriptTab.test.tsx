import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { memoryStore } from '../../services/storage'
import ScriptTab from './ScriptTab'

// jsdom 에서는 사전을 못 불러오므로 실패하는 경우를 흉내 낸다(Review Focus 3)
vi.mock('../../services/jaTokenizer', () => ({ loadJaTokenizer: () => Promise.reject(new Error('offline')) }))
afterEach(cleanup)

test('붙여넣기 → 나누기 → 저장하고 확인 화면으로', async () => {
  const store = memoryStore()
  render(<AppProvider store={store}><ScriptTab lang="ja" /></AppProvider>)
  fireEvent.change(await screen.findByLabelText('대본 붙여넣기'), { target: { value: 'おはよう！ 좋은 아침!\n元気？ 잘 지내?' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '나누기' })))
  const [m] = await store.listMaterials('ja')
  expect(m.lines.map((l) => [l.src, l.ko])).toEqual([['おはよう！', '좋은 아침!'], ['元気？', '잘 지내?']])
  expect(m.title).toBe('おはよう！')
  expect(m.lines[0].needsCheck).toContain('reading')
  expect(location.hash).toBe(`#/review/${m.id}`)
})

test('줄을 못 찾으면 알려 준다', async () => {
  render(<AppProvider store={memoryStore()}><ScriptTab lang="ja" /></AppProvider>)
  fireEvent.change(await screen.findByLabelText('대본 붙여넣기'), { target: { value: '[音楽]\n♪' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '나누기' })))
  expect(screen.getByText(/줄을 찾지 못했어요/)).toBeTruthy()
})

test('넷플릭스 추천은 새 탭, 안전한 링크', async () => {
  render(<AppProvider store={memoryStore()}><ScriptTab lang="ja" /></AppProvider>)
  const a = await screen.findByRole('link', { name: /마이코네 행복한 밥상/ })
  expect(a.getAttribute('target')).toBe('_blank')
  expect(a.getAttribute('rel')).toBe('noopener noreferrer')
})

test.each([
  ['tw', '你好！ 안녕!', (m: import('../../engine/types').Material) => m.lines[0].segments[0].zhuyin, 'ㄋㄧˇ ㄏㄠˇ'],
  ['zh', '你好！ 안녕!', (m: import('../../engine/types').Material) => m.lines[0].segments[0].reading, 'nǐ hǎo'],
  ['mn', 'Сайн уу? 안녕?', (m: import('../../engine/types').Material) => m.lines[0].segments[0].romaji, 'Sain'],
  ['en', 'Hello! 안녕!', (m: import('../../engine/types').Material) => m.lines[0].src, 'Hello!'],
] as const)('%s 대본도 읽기를 만든다', async (lang, text, pick, want) => {
  const store = memoryStore()
  render(<AppProvider store={store}><ScriptTab lang={lang} /></AppProvider>)
  fireEvent.change(await screen.findByLabelText('대본 붙여넣기'), { target: { value: text } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '나누기' })))
  // 병음 사전은 처음 한 번 따로 불러오므로 저장될 때까지 기다린다
  await waitFor(async () => expect(await store.listMaterials(lang)).toHaveLength(1), { timeout: 5000 })
  const [m] = await store.listMaterials(lang)
  expect(pick(m)).toBe(want)
  expect(m.lines[0].needsCheck).toBeUndefined()
})

test('몽골어는 넷플릭스 작품이 거의 없다고 알리고 유튜브로', async () => {
  render(<AppProvider store={memoryStore()}><ScriptTab lang="mn" /></AppProvider>)
  expect(await screen.findByText(/몽골어 작품이 거의 없어요/)).toBeTruthy()
  expect(screen.getByRole('link', { name: '유튜브로 찾기' }).getAttribute('href')).toBe('#/materials?lang=mn&tab=youtube')
})
