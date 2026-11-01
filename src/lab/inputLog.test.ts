import { describe, expect, test } from 'vitest'
import { createInputLogger, summarizeLog, type LoggedEvent } from './inputLog'

function fire(el: HTMLElement, type: string, init: { data?: string; key?: string } = {}) {
  const ev = type.startsWith('composition')
    ? new CompositionEvent(type, { data: init.data ?? '' })
    : type === 'keydown'
      ? new KeyboardEvent('keydown', { key: init.key })
      : new Event(type)
  el.dispatchEvent(ev)
}

describe('createInputLogger', () => {
  test('조합 이벤트의 data를 순서대로 기록한다', () => {
    const el = document.createElement('input')
    const log = createInputLogger(el)
    fire(el, 'compositionstart')
    fire(el, 'compositionupdate', { data: 'た' })
    fire(el, 'compositionupdate', { data: 'たべ' })
    fire(el, 'compositionend', { data: '食べ' })
    expect(log.events().map((e) => e.data).filter(Boolean)).toEqual(['た', 'たべ', '食べ'])
  })

  test('2000개를 넘으면 오래된 것부터 버린다', () => {
    const el = document.createElement('input')
    const log = createInputLogger(el)
    for (let i = 0; i < 2100; i++) fire(el, 'keydown', { key: 'a' })
    expect(log.events()).toHaveLength(2000)
  })

  test('dispose 뒤에는 기록하지 않는다', () => {
    const el = document.createElement('input')
    const log = createInputLogger(el)
    log.dispose()
    fire(el, 'keydown', { key: 'a' })
    expect(log.events()).toHaveLength(0)
  })
})

const ev = (type: LoggedEvent['type'], data?: string, extra: Partial<LoggedEvent> = {}): LoggedEvent => ({ t: 0, type, data, ...extra })

describe('summarizeLog — 5개 언어', () => {
  test('일본어 12키: 조합 중에 가나가 보인다', () => {
    const s = summarizeLog([ev('compositionupdate', 'た'), ev('compositionupdate', 'たべ'), ev('compositionend', '食べ')], ['kana', 'kanji'])
    expect(s.targetInComposition).toBe(true)
    expect(s.compositionSamples).toEqual(['た', 'たべ'])
  })

  test('대만어 주음: 조합 중에 주음 기호와 성조가 보인다', () => {
    const s = summarizeLog([ev('compositionupdate', 'ㄏ'), ev('compositionupdate', 'ㄏㄜ'), ev('compositionupdate', 'ㄋㄧˇ')], ['bopomofo'])
    expect(s.targetInComposition).toBe(true)
  })

  test('중국어 병음: 조합 중 글자가 로마자뿐이면 대상 문자 조합이 아니다(읽기는 병음으로 따로 비교)', () => {
    const s = summarizeLog([ev('compositionupdate', 'h'), ev('compositionupdate', 'he'), ev('compositionend', '喝')], ['hanzi'])
    expect(s.compositionEvents).toBe(3)
    expect(s.targetInComposition).toBe(false)
    expect(s.latinInComposition).toBe(true)
  })

  test('몽골어: 조합 없이 바로 입력돼도 요약이 된다', () => {
    const s = summarizeLog([ev('keydown', undefined, { key: 'б' }), ev('input', undefined, { value: 'б' })], ['cyrillic'])
    expect(s.compositionEvents).toBe(0)
    expect(s.keydownKeys).toEqual(['б'])
    expect(s.finalValue).toBe('б')
  })

  test('영어(Gboard): 영어에도 조합 이벤트가 오지만 대상 문자 판단은 라틴으로 한다', () => {
    const s = summarizeLog([ev('compositionupdate', 'hel'), ev('compositionend', 'hello')], ['latin'])
    expect(s.targetInComposition).toBe(true)
  })

  test('일본어를 고른 사람이 영어만 조합하면 대상 문자 조합이 아니다', () => {
    const s = summarizeLog([ev('compositionupdate', 'ta')], ['kana', 'kanji'])
    expect(s.targetInComposition).toBe(false)
    expect(s.latinInComposition).toBe(true)
  })

  test('keydown 키와 가장 작은 화면 높이를 모은다', () => {
    const s = summarizeLog([ev('keydown', undefined, { key: 'Process', vvHeight: 800 }), ev('input', undefined, { value: '你', vvHeight: 420 })], ['hanzi'])
    expect(s.keydownKeys).toEqual(['Process'])
    expect(s.minViewportHeight).toBe(420)
    expect(s.finalValue).toBe('你')
  })

  test('샘플은 중복 없이 최대 20개', () => {
    const many = Array.from({ length: 30 }, (_, i) => ev('compositionupdate', 'あ'.repeat((i % 25) + 1)))
    expect(summarizeLog(many, ['kana']).compositionSamples).toHaveLength(20)
  })
})
