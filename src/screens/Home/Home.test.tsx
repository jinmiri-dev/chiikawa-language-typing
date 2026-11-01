import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { memoryStore } from '../../services/storage'
import Home from './Home'

afterEach(cleanup)

test('처음 방문: 언어 카드 5개가 시작 버튼', async () => {
  render(<AppProvider store={memoryStore()}><Home /></AppProvider>)
  expect(await screen.findByText('배울 언어를 누르면 바로 시작해요')).toBeTruthy()
  const cards = screen.getAllByRole('link', { name: /영어|일본어|중국어|대만어|몽골어/ })
  expect(cards.map((c) => c.textContent?.match(/영어|일본어|중국어 \(간체\)|대만어 \(번체\)|몽골어/)?.[0])).toEqual([
    '영어', '일본어', '중국어 (간체)', '대만어 (번체)', '몽골어',
  ])
  expect(cards[1].getAttribute('href')).toBe('#/materials?lang=ja&tab=starter')
  expect(screen.getByText('개발자: 진미리')).toBeTruthy()
  expect(screen.queryByText('이어서 공부하기')).toBeNull()
})

test('다시 방문: 이어서 공부하기', async () => {
  const store = memoryStore()
  await store.saveProgress({ materialId: 'ja-plan', lineIndex: 3, results: [], activeMs: 0, friend: 'chiikawa', updatedAt: 1 })
  render(<AppProvider store={store}><Home /></AppProvider>)
  expect(await screen.findByText('다시 왔네요! 오늘도 한 줄씩 쳐 봐요.')).toBeTruthy()
  const cont = screen.getByRole('link', { name: /이어서 공부하기/ })
  expect(cont.getAttribute('href')).toBe('#/study/ja-plan')
  expect(cont.textContent).toContain('3 / 10줄')
})

test('저장이 안 되는 브라우저는 알린다', async () => {
  render(<AppProvider store={memoryStore()}><Home /></AppProvider>)
  expect(await screen.findByText('이 브라우저에서는 기록이 저장되지 않아요')).toBeTruthy()
})
