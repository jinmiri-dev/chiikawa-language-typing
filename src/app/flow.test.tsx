import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { starterMaterial } from '../content/starter'
import App from './App'

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

test('처음 방문 → 일본어 → 인사와 대답 10줄 → 완료 → 시작 화면은 이어서 공부하기', async () => {
  render(<App />)
  const ja = await screen.findByRole('link', { name: /일본어/ })
  await go(ja.getAttribute('href')!)
  // 언어를 누르면 초보 코스가 먼저 열린다
  expect(await screen.findByText('오늘의 레슨 시작')).toBeTruthy()
  await go('#/materials?lang=ja&tab=starter')
  const set = await screen.findByRole('link', { name: /인사와 대답/ })
  await go(set.getAttribute('href')!)

  const lines = starterMaterial('ja-greet')!.lines
  for (const line of lines) {
    const input = (await screen.findByLabelText('여기에 쳐 보세요')) as HTMLInputElement
    await act(async () => {
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: line.src } })
      fireEvent.compositionEnd(input, { data: line.src })
    })
    const next = await screen.findByRole('button', { name: /(다음 줄|결과 보기) Enter$/ })
    await act(async () => fireEvent.click(next))
  }

  expect(location.hash).toBe('#/done/ja-greet')
  await go('#/done/ja-greet')
  expect(await screen.findByText('언어 1급 따냈어요!')).toBeTruthy()
  expect(screen.getByText('10줄')).toBeTruthy()
  expect(screen.getByText('첫 기록이에요')).toBeTruthy()

  await go('#/')
  const cont = await screen.findByRole('link', { name: /이어서 공부하기/ })
  expect(cont.textContent).toContain('10 / 10줄')
}, 30_000)

