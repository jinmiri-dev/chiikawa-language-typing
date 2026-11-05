import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { memoryStore, type Store } from '../../services/storage'
import { speak } from '../../services/speech'
import Study from './Study'

vi.mock('../../services/speech', async (orig) => ({ ...(await orig<typeof import('../../services/speech')>()), speak: vi.fn(async () => ({ source: 'device' as const })) }))

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

test('줄을 다 치면 그 줄을 한 번 더 들려준다(설정으로 끌 수 있다)', async () => {
  vi.mocked(speak).mockClear()
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気')())
  expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['おはよう！元気？'])
})

test('단어를 다 칠 때마다 그 단어를 읽어 준다', async () => {
  vi.mocked(speak).mockClear()
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう')())
  expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['おはよう！'])
  // 같은 단어를 지웠다 다시 쳐도 또 읽지 않는다
  await act(async () => compose(input, 'おはよう', 'おはよう')())
  expect(vi.mocked(speak)).toHaveBeenCalledTimes(1)
})

test('줄을 다 치고 듣기가 끝나면 다음 줄로 넘어간다', async () => {
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気')())
  expect(await screen.findByText(/^2 \/ \d+줄$/, undefined, { timeout: 2000 })).toBeTruthy()
})

test('자동으로 넘어가기를 끄면 그 줄에 머문다', async () => {
  await store.saveSettings({ ...(await store.getSettings()), autoNext: false })
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気')())
  await act(async () => new Promise((r) => setTimeout(r, 1200)))
  expect(screen.getByText(/^1 \/ \d+줄$/)).toBeTruthy()
})

test('다 치고 듣기를 끄면 들려주지 않는다', async () => {
  await store.saveSettings({ ...(await store.getSettings()), listenAfter: false })
  vi.mocked(speak).mockClear()
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気')())
  expect(vi.mocked(speak)).not.toHaveBeenCalled()
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

describe.each([
  ['tw-greet', 'zh-TW', 'ㄗㄠˇ', '早安 → ㄗㄠˇ ㄢ → Y L 3 0 Space → Enter로 확정'],
  ['zh-greet', 'zh-CN', 'zǎo shàng', '早上 → zǎo shàng → Z A O S H A N G → Space로 후보 선택'],
  ['en-greet', 'en', undefined, 'Morning → Shift+M O R N I N G'],
  ['mn-greet', 'mn', 'Öglöönii', 'Өглөөний (Öglöönii) → Ө(Shift+F) г(U)'],
])('%s 학습 화면', (id, htmlLang, ruby, guide) => {
  test('그 언어로 보이고 안내도 그 언어', async () => {
    render(<AppProvider store={store}><Study materialId={id} /></AppProvider>)
    const input = await screen.findByLabelText('여기에 쳐 보세요')
    expect(input.getAttribute('lang')).toBe(htmlLang)
    expect(document.querySelector('.sentence')?.getAttribute('lang')).toBe(htmlLang)
    if (ruby) expect(document.querySelector('.sentence-src rt')?.textContent).toContain(ruby)
    else expect(document.querySelector('.sentence-src rt')).toBeNull()
    expect(document.querySelector('.guide-line, .notice')?.textContent).toContain(guide)
  })
})
