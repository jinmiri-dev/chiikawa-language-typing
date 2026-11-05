import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { AppProvider } from '../app/AppState'
import * as api from '../services/api'
import { speakKo } from '../services/speech'
import { memoryStore, type Store } from '../services/storage'
import LearnSheet from './LearnSheet'
import { LearnList, LearnStart } from './LearnList'
import LearnVideo from './LearnVideo'
import { getNative, listLearnWords, listSentences } from './learnStore'

vi.mock('../services/api', async (orig) => ({ ...(await orig<typeof import('../services/api')>()), getLyrics: vi.fn() }))
vi.mock('../services/speech', async (orig) => ({ ...(await orig<typeof import('../services/speech')>()), speakKo: vi.fn(async () => ({ source: 'device' as const })) }))

const lyrics: api.LyricsResult = {
  videoId: 'Wdsyfs3JCkQ', to: 'zh', source: 'manual', meaningSource: 'youtube',
  lines: [
    { start: 2, end: 5, ko: '곰 세 마리가 한 집에 있어', meaning: '三只熊住在一个家里' },
    { start: 5, end: 8, ko: '아빠 곰은 뚱뚱해', meaning: '熊爸爸很胖' },
  ],
}
let store: Store
beforeEach(() => {
  store = memoryStore()
  vi.mocked(api.getLyrics).mockReset().mockResolvedValue(lyrics)
  vi.mocked(speakKo).mockClear()
})
afterEach(cleanup)

const wrap = (ui: React.ReactNode) => render(<AppProvider store={store}>{ui}</AppProvider>)

test('모국어 고르기: 다섯 언어가 자기 말로 보이고, 고르면 기억한다', async () => {
  wrap(<LearnStart />)
  const mn = await screen.findByText('Монгол хэл')
  expect(screen.getByText('简体中文')).toBeTruthy()
  await act(async () => fireEvent.click(mn))
  expect(await getNative(store)).toBe('mn')
})

test('영상 목록은 모국어 화면, 상황 태그로 거른다', async () => {
  wrap(<LearnList native="zh" />)
  expect(await screen.findByRole('heading', { name: '学韩语' })).toBeTruthy()
  expect(screen.getByText('곰 세 마리')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '身体·医院' })))
  expect(screen.getByText('진찰송')).toBeTruthy()
  expect(screen.queryByText('곰 세 마리')).toBeNull()
})

test('가사 보기: 한국어·발음·모국어 뜻, 단어를 누르면 읽고 단어장에(조사 떼고)', async () => {
  wrap(<LearnVideo native="zh" videoId="Wdsyfs3JCkQ" />)
  expect(await screen.findByText('三只熊住在一个家里')).toBeTruthy()
  expect(screen.getByText('gom se mariga han jibe isseo')).toBeTruthy()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '마리가' })))
  expect(speakKo).toHaveBeenCalledWith('마리가', 0.85)
  expect((await listLearnWords(store)).map((w) => w.word)).toEqual(['마리'])
  expect(await screen.findByText('「마리」已加入单词本')).toBeTruthy()
})

test('따라 부르기: 낱말 일부가 빈칸, 누르면 보인다', async () => {
  wrap(<LearnVideo native="zh" videoId="Wdsyfs3JCkQ" />)
  await screen.findByText('三只熊住在一个家里')
  await act(async () => fireEvent.click(screen.getByRole('tab', { name: '跟着唱' })))
  const blanks = screen.getAllByRole('button', { name: '点空格看答案' })
  expect(blanks.length).toBeGreaterThan(0)
  await act(async () => fireEvent.click(blanks[0]))
  expect(screen.getAllByRole('button', { name: '点空格看答案' }).length).toBe(blanks.length - 1)
})

test('문장을 저장하면 학습지에 원고지 칸으로 나온다(진한 줄·연한 줄·빈 줄)', async () => {
  wrap(<LearnVideo native="zh" videoId="Wdsyfs3JCkQ" />)
  await screen.findByText('三只熊住在一个家里')
  await act(async () => fireEvent.click(screen.getAllByRole('button', { name: '收藏这句' })[0]))
  expect((await listSentences(store)).map((s) => s.ko)).toEqual(['곰 세 마리가 한 집에 있어'])
  cleanup()
  wrap(<LearnSheet native="zh" />)
  expect(await screen.findByText(/三只熊住在一个家里/)).toBeTruthy()
  const model = document.querySelector('.ws-model')!
  expect([...model.children].map((c) => c.textContent).join('|')).toBe('곰||세||마|리|가||한||집|에')
  expect(document.querySelectorAll('.ws-trace').length).toBe(document.querySelectorAll('.ws-model').length)
  expect(document.querySelectorAll('.ws-empty').length).toBe(document.querySelectorAll('.ws-model').length)
})

test('한국어 자막이 없는 영상은 모국어로 이유를 알린다', async () => {
  vi.mocked(api.getLyrics).mockRejectedValue(new api.ApiFailure('NO_TRACK', ''))
  wrap(<LearnVideo native="mn" videoId="Wdsyfs3JCkQ" />)
  expect(await screen.findByText('Энэ бичлэгт солонгос хадмал байхгүй. Өөр бичлэг сонгоно уу.')).toBeTruthy()
})

test('학습지는 연 사람 모국어로 뜻을 보여 준다(다른 말로 저장한 문장은 뜻을 받아 채운다)', async () => {
  wrap(<LearnVideo native="zh" videoId="Wdsyfs3JCkQ" />)
  await screen.findByText('三只熊住在一个家里')
  await act(async () => fireEvent.click(screen.getAllByRole('button', { name: '收藏这句' })[0]))
  cleanup()
  vi.mocked(api.getLyrics).mockResolvedValue({ ...lyrics, to: 'mn', lines: [{ start: 2, end: 5, ko: '곰 세 마리가 한 집에 있어', meaning: 'Нэг байшинд гурван баавгай' }] })
  wrap(<LearnSheet native="mn" />)
  expect(await screen.findByText('Нэг байшинд гурван баавгай')).toBeTruthy()
  expect(api.getLyrics).toHaveBeenLastCalledWith('mn', 'Wdsyfs3JCkQ')
  expect((await listSentences(store))[0].meanings).toEqual({ zh: '三只熊住在一个家里', mn: 'Нэг байшинд гурван баавгай' })
})
