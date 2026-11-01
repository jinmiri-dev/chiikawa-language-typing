import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { exportBackup, importBackup } from '../services/backup'
import { memoryStore, type Store } from '../services/storage'
import { wordsCsv } from '../engine/words/export'

// jsdom 은 사전 파일을 못 받으므로 아주 작은 분석기를 대신 넣는다(한자 덩어리와 나머지)
vi.mock('../services/jaTokenizer', () => ({
  loadJaTokenizer: async () => (s: string) =>
    (s.match(/\p{Script=Han}+|[^\p{Script=Han}]+/gu) ?? []).map((w) => ({
      surface_form: w,
      pos: /^[、。！？]+$/.test(w) ? '記号' : '名詞',
      pos_detail_1: '一般',
      reading: w === '元気' ? 'ゲンキ' : undefined,
    })),
}))
let store: Store
vi.mock('../services/storage', async (orig) => {
  const mod = await orig<typeof import('../services/storage')>()
  return { ...mod, openStore: async () => store }
})

beforeEach(() => {
  store = memoryStore()
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }))
  location.hash = '#/materials?lang=ja&tab=script'
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function follow() {
  await act(async () => window.dispatchEvent(new HashChangeEvent('hashchange')))
}

test('대본 붙여넣기 → 확인 → 연습 2줄 → 단어 담기 → CSV → 백업 → 복원', async () => {
  render(<App />)
  fireEvent.change(await screen.findByLabelText('대본 붙여넣기'), { target: { value: '元気？ 잘 지내?\nうん、まあね。 응, 그럭저럭.\n♪～' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '나누기' })))
  await follow()
  expect(location.hash).toMatch(/^#\/review\/ja-s/)
  expect(await screen.findByText(/2줄로 나눴어요/)).toBeTruthy()

  await act(async () => fireEvent.click(screen.getByRole('link', { name: '연습 시작' })))
  location.hash = screen.getByRole('link', { name: '연습 시작' }).getAttribute('href')!
  await follow()

  await act(async () => fireEvent.click(await screen.findByRole('button', { name: '元気 단어장에 담기' })))
  for (const src of ['元気？', 'うん、まあね。']) {
    const input = (await screen.findByLabelText('여기에 쳐 보세요')) as HTMLInputElement
    await act(async () => {
      fireEvent.compositionStart(input)
      fireEvent.change(input, { target: { value: src } })
      fireEvent.compositionEnd(input, { data: src })
    })
    await act(async () => fireEvent.click(await screen.findByRole('button', { name: /다음 줄|결과 보기/ })))
  }
  expect(location.hash).toMatch(/^#\/done\/ja-s/)

  const words = await store.listWords('ja')
  expect(wordsCsv(words)).toContain('元気,げんき,,元気？,잘 지내?')

  const backup = JSON.parse(JSON.stringify(await exportBackup(store)))
  const fresh = memoryStore()
  expect(await importBackup(fresh, backup, 'overwrite')).toMatchObject({ ok: true })
  const [m] = await fresh.listMaterials('ja')
  expect(m.lines.map((l) => l.src)).toEqual(['元気？', 'うん、まあね。'])
  expect((await fresh.getProgress(m.id))?.lineIndex).toBe(2)
  expect((await fresh.listWords('ja')).length).toBe(1)
}, 30_000)

