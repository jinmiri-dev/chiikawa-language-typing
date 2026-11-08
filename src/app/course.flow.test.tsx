import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'

// 일본어 사전(17MB)을 테스트마다 읽으면 느려 흔들린다: 읽기 없이 만든다(코스 흐름만 본다)
vi.mock('../services/segmenter', async (orig) => ({ ...(await orig<typeof import('../services/segmenter')>()), loadSegmenter: vi.fn(async () => { throw new Error('test') }) }))

beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  // 저장소가 없는 환경 = 메모리 저장소
  // @ts-expect-error 테스트
  delete globalThis.indexedDB
  location.hash = '#/'
}, 30_000)
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
}, 30_000)

async function go(hash: string) {
  await act(async () => {
    location.hash = hash
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

test('초보 코스: 글자 레슨을 끝내면 진도·연속 학습일이 오르고 다음 레슨으로', async () => {
  render(<App />)
  await go('#/materials?lang=ja&tab=course')
  const first = await screen.findByRole('link', { name: /오늘의 레슨 시작/ }, { timeout: 5000 })
  expect(first.getAttribute('href')).toBe('#/study/ja-c0x1')
  await go('#/study/ja-c0x1')
  for (const src of ['あいうえお', 'かきくけこ', 'さしすせそ', 'たちつてと', 'なにぬねの', 'あさ', 'いえ', 'くち', 'なつ', 'ねこ']) {
    const input = (await screen.findByLabelText('여기에 쳐 보세요', {}, { timeout: 5000 })) as HTMLInputElement
    await act(async () => {
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: src } })
      fireEvent.compositionEnd(input, { data: src })
    })
    const next = await screen.findByRole('button', { name: /(다음 줄|결과 보기) Enter$/ }, { timeout: 5000 })
    await act(async () => fireEvent.click(next))
  }
  await go('#/done/ja-c0x1')
  const nextLesson = await screen.findByRole('link', { name: '다음 레슨' }, { timeout: 5000 })
  expect(nextLesson.getAttribute('href')).toBe('#/study/ja-c0x2')
  await go('#/materials?lang=ja&tab=course')
  expect(await screen.findByText('1 / 125', {}, { timeout: 5000 })).toBeTruthy()
  expect(screen.getByText('1일')).toBeTruthy()
}, 30_000)
