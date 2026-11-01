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

test('단어를 누르면 단어장에 담기고 그 줄이 복습에 들어간다', async () => {
  await open()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '元気 단어장에 담기' })))
  expect((await store.listWords('ja')).map((w) => [w.text, w.reading, w.example?.ko])).toEqual([['元気', 'げんき', '좋은 아침! 잘 지내?']])
  expect((await store.listReview()).map((r) => r.id)).toEqual(['ja-greet|greet-01'])
  expect(screen.getByRole('button', { name: '단어 1' })).toBeTruthy()
})

test('틀린 줄은 복습에 들어간다', async () => {
  const input = await open()
  await act(async () => compose(input, 'おはや', 'おはや')())
  await act(async () => compose(input, 'おはよう！元気', 'おはよう！元気')())
  expect((await store.listReview()).map((r) => r.id)).toEqual(['ja-greet|greet-01'])
})

test('읽기 확인이 필요한 대본 줄도 화면이 멈추지 않는다', async () => {
  await store.saveMaterial({
    id: 'ja-sx', lang: 'ja', kind: 'script', title: '대본', koSource: 'given', createdAt: 1,
    lines: [{ id: 'l001', src: '今日は', ko: '오늘은', segments: [{ text: '今日は', reading: '今日は', isWord: true, confident: false }], needsCheck: ['reading'] }],
  })
  render(<AppProvider store={store}><Study materialId="ja-sx" /></AppProvider>)
  expect(await screen.findByText(/읽기를 확인하지 못한 줄이에요/)).toBeTruthy()
})
