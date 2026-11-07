import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { AppProvider } from '../../app/AppState'
import { memoryStore, type Store } from '../../services/storage'
import { speak } from '../../services/speech'
import Study from './Study'

vi.mock('../../services/speech', async (orig) => ({ ...(await orig<typeof import('../../services/speech')>()), speak: vi.fn(async () => ({ source: 'device' as const })) }))

vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  getGloss: vi.fn(async (_l: string, lines: { src: string }[]) => lines.map((l) => (l.src.startsWith('おはよう') ? [['おはよう', '좋은 아침'], ['元気', '잘 지내']] : []))),
}))

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
  await act(async () => void compose(input, 'おはよ', ''))
  expect(document.querySelector('[data-wrong]')).toBeNull()
  await act(async () => void compose(input, 'おはや', ''))
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
  await act(async () => compose(input, 'おはよう', 'おはよう！元気？')())
  expect(screen.getByText(/맞았어요/)).toBeTruthy()
  await act(async () => {})
  expect((await store.getProgress('ja-greet'))?.lineIndex).toBe(1)
})

test('줄을 다 치면 그 줄을 한 번 더 들려준다(설정으로 끌 수 있다)', async () => {
  vi.mocked(speak).mockClear()
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気？')())
  expect(vi.mocked(speak).mock.calls.map((c) => c[0])).toEqual(['おはよう！元気？'])
})

test('치는 도중에는 읽어 주지 않는다(빠르게 치면 소리가 끊겨서)', async () => {
  vi.mocked(speak).mockClear()
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！')())
  expect(vi.mocked(speak)).not.toHaveBeenCalled()
})

test('줄을 다 치면 한 번 들려주고 그 줄에 머문다(Enter 를 눌러야 다음 줄, 그 사이 Esc 로 다시 듣기)', async () => {
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気？')())
  await act(async () => new Promise((r) => setTimeout(r, 1200)))
  expect(screen.getByText(/^1 \/ \d+줄$/)).toBeTruthy()
  vi.mocked(speak).mockClear()
  await act(async () => fireEvent.keyDown(window, { key: 'Escape' }))
  expect(vi.mocked(speak)).toHaveBeenCalled()
  await act(async () => fireEvent.keyDown(window, { key: 'Enter' }))
  expect(await screen.findByText(/^2 \/ \d+줄$/)).toBeTruthy()
})

test('설정에서 저절로 넘어가기를 켜면 다 들은 뒤 다음 줄로', async () => {
  await store.saveSettings({ ...(await store.getSettings()), autoAdvance: true })
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気？')())
  expect(await screen.findByText(/^2 \/ \d+줄$/, undefined, { timeout: 2000 })).toBeTruthy()
})

test('다 치고 듣기를 끄면 들려주지 않는다', async () => {
  await store.saveSettings({ ...(await store.getSettings()), listenAfter: false })
  vi.mocked(speak).mockClear()
  const input = await open()
  await act(async () => compose(input, 'おはよう', 'おはよう！元気？')())
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
  await act(async () => compose(input, 'おはよう！元気', 'おはよう！元気？')())
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

test('유튜브 재료는 연습 화면에서 영상을 저장할 수 있고, 뒤로 가면 유튜브 탭', async () => {
  await store.saveMaterial({
    id: 'ja-yvvvvvvvvvvv', lang: 'ja', kind: 'youtube', title: '영상 제목', youtubeId: 'vvvvvvvvvvv', koSource: 'youtube', createdAt: 1,
    lines: [{ id: 'l001', src: 'こんにちは', ko: '안녕', start: 0, end: 2, segments: [{ text: 'こんにちは', reading: 'こんにちは', isWord: true, confident: true }] }],
  })
  render(<AppProvider store={store}><Study materialId="ja-yvvvvvvvvvvv" /></AppProvider>)
  // 앞 시험의 자동 넘김 타이머가 남아 있어도 화면이 다 그려질 때까지 act 안에서 기다린다
  await act(async () => new Promise((r) => setTimeout(r, 1500)))
  await act(async () => fireEvent.click(await screen.findByRole('button', { name: '영상 저장' })))
  expect((await store.listSaved('ja')).map((v) => [v.videoId, v.title])).toEqual([['vvvvvvvvvvv', '영상 제목']])
  expect(screen.getByRole('button', { name: '영상 저장 취소' })).toBeTruthy()
  expect(screen.getByRole('link', { name: '뒤로' }).getAttribute('href')).toContain('tab=youtube')
})

test('0.75배는 누르면 켜지고 다시 누르면 보통 빠르기로 돌아온다(누를 때마다 그 빠르기로 다시 들려준다)', async () => {
  await open()
  vi.mocked(speak).mockClear()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '0.75배' })))
  expect((await store.getSettings()).rate).toBe(0.75)
  expect(screen.getByRole('button', { name: '✓ 0.75배 켜짐' }).getAttribute('aria-pressed')).toBe('true')
  expect(vi.mocked(speak).mock.calls.at(-1)?.[1]).toMatchObject({ rate: 0.75 })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '✓ 0.75배 켜짐' })))
  expect((await store.getSettings()).rate).toBe(1)
  expect(vi.mocked(speak).mock.calls.at(-1)?.[1]).toMatchObject({ rate: 1 })
})

test('입력기로 조합 중인 가나도 문장 강조가 따라간다(확정 전)', async () => {
  const input = await open()
  await act(async () => void compose(input, 'おはよう', ''))
  expect(document.querySelectorAll('.ch-typing').length).toBe(4)
  expect(document.querySelector('.ch-now')?.textContent).toBe('！')
})

test('Esc 로 다시 듣기', async () => {
  await open()
  vi.mocked(speak).mockClear()
  await act(async () => fireEvent.keyDown(window, { key: 'Escape' }))
  // 처음 화면의 소리가 늦게 오는 수가 있어, 횟수 대신 마지막으로 읽은 것이 이 줄인지 본다
  expect(vi.mocked(speak).mock.calls.at(-1)?.[0]).toBe('おはよう！元気？')
})

test('낱말 짝: 지금 칠 낱말과 한국어 뜻 속 그 낱말이 함께 밝아지고, 담을 수 있다', async () => {
  const input = await open()
  const chip = await screen.findByText('좋은 아침', { selector: '.pair-chip span' })
  expect(chip).toBeTruthy()
  expect(document.querySelector('.ko-pair')?.textContent).toBe('좋은 아침')
  expect(document.querySelectorAll('.ch[data-pair]').length).toBe(4)
  await act(async () => compose(input, 'おはよう', 'おはよう！')())
  expect(document.querySelector('.ko-pair')?.textContent).toBe('잘 지내')
  await act(async () => fireEvent.click(screen.getByRole('button', { name: '☆ 담기' })))
  expect((await store.listWords('ja')).map((w) => w.text)).toContain('元気')
})

test('휴대폰: 입력칸을 누르면(키보드가 올라오면) 자판 그림을 숨기고 누를 키 안내는 입력칸 위에 남긴다', async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse'), media: q, addEventListener() {}, removeEventListener() {} }))
  const input = await open()
  const guide = document.querySelector('.guide-line')!
  expect(guide.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(screen.queryByText('자판 그림 접기')).not.toBeNull()
  await act(async () => {
    fireEvent.pointerDown(input)
    fireEvent.focus(input)
  })
  expect(screen.queryByText('자판 그림 접기')).toBeNull()
  expect(document.querySelector('.guide-line')).not.toBeNull()
  expect(screen.getByLabelText('다시 듣기')).toBeTruthy()
  await act(async () => void fireEvent.blur(input))
  expect(screen.queryByText('자판 그림 접기')).not.toBeNull()
})

test('몽골어 PC: 몽골어 자판이 없어도 그림 자리대로 누르면 몽골 글자가 들어간다', async () => {
  const { mnPcChar } = await import('../../engine/layouts')
  expect(mnPcChar('b', false)).toBe('м')
  expect(mnPcChar('b', true)).toBe('М')
  expect(mnPcChar('f', false)).toBe('ө')
  expect(mnPcChar('6', true)).toBe('.')
  expect(mnPcChar('8', true)).toBe(',')
  expect(mnPcChar('6', false)).toBeNull()
  expect(mnPcChar('space', false)).toBeNull()
})
