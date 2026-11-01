import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { memoryStore, type Store } from '../../services/storage'
import Study from './Study'

let store: Store
beforeEach(() => {
  store = memoryStore()
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function open() {
  render(<AppProvider store={store}><Study materialId="ja-greet" /></AppProvider>)
  return (await screen.findByLabelText('여기에 쳐 보세요')) as HTMLInputElement
}

/** IME 조합을 흉내 낸다: 시작 → 값 바뀜(조합 중) → 끝 */
function compose(input: HTMLInputElement, composing: string, committed: string) {
  fireEvent.compositionStart(input)
  fireEvent.compositionUpdate(input, { data: composing })
  fireEvent.change(input, { target: { value: composing } })
  return () => {
    fireEvent.change(input, { target: { value: committed } })
    fireEvent.compositionEnd(input, { data: committed })
  }
}

test('조합 중에는 오답 표시가 없다', async () => {
  const input = await open()
  compose(input, 'おはよ', '')
  expect(document.querySelector('[data-wrong]')).toBeNull()
  compose(input, 'おはや', '')
  expect(document.querySelector('[data-wrong]')).toBeNull()
})

test('확정했는데 틀리면 오답 표시와 이유', async () => {
  const input = await open()
  compose(input, 'おはよ', 'おはや')()
  expect(document.querySelector('[data-wrong]')).not.toBeNull()
  expect(screen.getByText(/よ 대신 や를 쳤어요/)).toBeTruthy()
})

test('첫 줄을 맞게 치면 맞았어요, 진도 저장', async () => {
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気')())
  expect(screen.getByText(/맞았어요/)).toBeTruthy()
  await act(async () => {})
  expect((await store.getProgress('ja-greet'))?.lineIndex).toBe(1)
})
