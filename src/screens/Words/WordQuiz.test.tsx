import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import type { WordStates } from '../../engine/quiz'
import { memoryStore, type Store } from '../../services/storage'
import WordQuiz from './WordQuiz'

vi.mock('../../services/speech', async (orig) => ({ ...(await orig<typeof import('../../services/speech')>()), speak: vi.fn(async () => ({ source: 'device' as const })) }))

let store: Store
beforeEach(async () => {
  store = memoryStore()
  const from = { materialId: 'm', lineId: 'l' }
  await store.saveWord({ id: 'ja:話', lang: 'ja', text: '話', reading: 'はなし', meaning: '이야기', from, savedAt: 1 })
  await store.saveWord({ id: 'ja:雨', lang: 'ja', text: '雨', reading: 'あめ', meaning: '비', from, savedAt: 2 })
})
afterEach(cleanup)

test('뜻 고르기 → 직접 쳐 보기 → 결과, 틀린 단어는 내일 다시', async () => {
  render(<AppProvider store={store}><WordQuiz lang="ja" /></AppProvider>)
  expect(await screen.findByText('1 / 2 · 뜻 고르기')).toBeTruthy()
  // 첫 단어(話): 맞는 뜻
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '이야기' })))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '다음: 직접 쳐 보기' })))
  fireEvent.change(screen.getByLabelText('낱말 쳐 보기'), { target: { value: '話' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /확인/ })))
  expect(screen.getByText('맞았어요!')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /다음 단어/ })))
  // 둘째 단어(雨): 틀린 뜻(보기는 섞이므로 '비'가 아닌 것 아무거나)
  const wrongOne = [...document.querySelectorAll<HTMLButtonElement>('.quiz-option')].find((b) => b.textContent !== '비')!
  await act(async () => fireEvent.click(wrongOne))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '다음: 직접 쳐 보기' })))
  fireEvent.change(screen.getByLabelText('낱말 쳐 보기'), { target: { value: '雨' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /확인/ })))
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /결과 보기/ })))
  expect(screen.getByText('1 / 2 맞혔어요')).toBeTruthy()
  const st = (await store.getMeta<WordStates>('wordQuiz:ja'))!
  expect(st['ja:話'].step).toBe(1)
  expect(st['ja:雨'].step).toBe(0)
})

test('뜻 있는 단어가 없으면 담는 법을 알려 준다', async () => {
  const empty = memoryStore()
  render(<AppProvider store={empty}><WordQuiz lang="en" /></AppProvider>)
  expect(await screen.findByText('오늘 복습할 단어가 없어요')).toBeTruthy()
})
