import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import * as api from '../../services/api'
import { memoryStore, type Store } from '../../services/storage'
import { levelOf } from '../../services/news'
import NewsTab from './NewsTab'

vi.mock('../../services/api', async (orig) => ({ ...(await orig<typeof import('../../services/api')>()), getNews: vi.fn() }))

let store: Store
beforeEach(() => {
  store = memoryStore()
  vi.mocked(api.getNews).mockResolvedValue({
    articles: [
      { id: 'a1', title: '大雨で川があふれる', source: 'NHK', link: 'https://www3.nhk.or.jp/a1', date: '', tag: 'society', lines: [{ src: '大雨で川があふれる', ko: '폭우로 강이 넘치다' }] },
      { id: 'a2', title: '円安が進む', source: 'NHK', link: 'https://www3.nhk.or.jp/a2', date: '', tag: 'economy', lines: [{ src: '円安が進む' }] },
    ],
  })
})
afterEach(cleanup)

test('태그로 고르고, 카드에 뜻·분야·원문 링크가 보인다', async () => {
  render(<AppProvider store={store}><NewsTab lang="ja" /></AppProvider>)
  expect(await screen.findByText('폭우로 강이 넘치다')).toBeTruthy()
  expect(screen.getByRole('link', { name: '大雨で川があふれる 원문 기사' }).getAttribute('href')).toBe('https://www3.nhk.or.jp/a1')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '경제 1' })))
  expect(screen.queryByText('폭우로 강이 넘치다')).toBeNull()
  // 기사를 누르면 타자가 아니라 뉴스 듣기 화면으로 간다
  await act(async () => fireEvent.click(screen.getByRole('button', { name: /円安/ })))
  await waitFor(() => expect(location.hash).toMatch(/^#\/read\/ja-n/))
})

test('기사 길이로 쉬움·보통·어려움', () => {
  expect(levelOf({ title: '雨', lines: [{ src: '雨が降る' }] })).toBe('쉬움')
  expect(levelOf({ title: 'Rain', lines: [{ src: 'x'.repeat(200) }] })).toBe('어려움')
})
