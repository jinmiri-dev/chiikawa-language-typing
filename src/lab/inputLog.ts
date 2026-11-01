/** 입력 시험(#/lab/input)에서 키보드·입력기 이벤트를 기록하고 요약한다. 기획안 11.2·15장. */

export type LoggedEventType = 'keydown' | 'beforeinput' | 'compositionstart' | 'compositionupdate' | 'compositionend' | 'input'

export interface LoggedEvent {
  t: number
  type: LoggedEventType
  key?: string
  code?: string
  isComposing?: boolean
  inputType?: string
  data?: string | null
  value?: string
  vvHeight?: number
}

export type Script = 'kana' | 'kanji' | 'bopomofo' | 'hanzi' | 'cyrillic' | 'latin'

const SCRIPT_RE: Record<Script, RegExp> = {
  kana: /[぀-ヿ]/,
  kanji: /\p{Script=Han}/u,
  hanzi: /\p{Script=Han}/u,
  bopomofo: /[㄀-ㄯˊˇˋ˙]/,
  cyrillic: /\p{Script=Cyrillic}/u,
  latin: /[A-Za-z]/,
}

const EVENT_TYPES: LoggedEventType[] = ['keydown', 'beforeinput', 'compositionstart', 'compositionupdate', 'compositionend', 'input']
const MAX_SAMPLES = 20

export function createInputLogger(el: HTMLInputElement | HTMLTextAreaElement, opts: { max?: number } = {}) {
  const max = opts.max ?? 2000
  let list: LoggedEvent[] = []

  const handler = (e: Event) => {
    const item: LoggedEvent = { t: performance.now(), type: e.type as LoggedEventType }
    const vv = window.visualViewport?.height
    if (vv !== undefined) item.vvHeight = Math.round(vv)
    if (e instanceof KeyboardEvent) {
      item.key = e.key
      item.code = e.code
      item.isComposing = e.isComposing
    }
    if (e instanceof CompositionEvent) item.data = e.data
    if (typeof InputEvent !== 'undefined' && e instanceof InputEvent) {
      item.inputType = e.inputType
      item.data = e.data
      item.isComposing = e.isComposing
    }
    if (e.type === 'input') item.value = el.value
    list.push(item)
    if (list.length > max) list = list.slice(list.length - max)
  }

  for (const t of EVENT_TYPES) el.addEventListener(t, handler)

  return {
    events: () => list.slice(),
    clear: () => {
      list = []
    },
    dispose: () => {
      for (const t of EVENT_TYPES) el.removeEventListener(t, handler)
    },
  }
}

export interface LogSummary {
  compositionEvents: number
  /** 조합 중 글자에 고른 언어의 문자(가나·주음·라틴 등)가 나왔는가 */
  targetInComposition: boolean
  /** 조합 중 글자에 로마자가 나왔는가(병음·로마자 입력) */
  latinInComposition: boolean
  compositionSamples: string[]
  keydownKeys: string[]
  finalValue: string
  minViewportHeight: number | null
}

export function summarizeLog(events: LoggedEvent[], target: Script[]): LogSummary {
  const comp = events.filter((e) => e.type.startsWith('composition'))
  const updates = comp.filter((e) => e.type === 'compositionupdate' && e.data).map((e) => e.data as string)
  const samples: string[] = []
  for (const d of updates) {
    if (!samples.includes(d)) samples.push(d)
    if (samples.length >= MAX_SAMPLES) break
  }
  const heights = events.map((e) => e.vvHeight).filter((h): h is number => typeof h === 'number')
  const lastInput = [...events].reverse().find((e) => e.type === 'input')
  return {
    compositionEvents: comp.length,
    targetInComposition: updates.some((d) => target.some((s) => SCRIPT_RE[s].test(d))),
    latinInComposition: updates.some((d) => SCRIPT_RE.latin.test(d)),
    compositionSamples: samples,
    keydownKeys: events.filter((e) => e.type === 'keydown' && e.key).map((e) => e.key as string),
    finalValue: lastInput?.value ?? '',
    minViewportHeight: heights.length ? Math.min(...heights) : null,
  }
}

/** 조합 결과를 사람이 읽을 말로. 조합이 없는 것도 정상이다(영어·몽골어 등). */
export function compositionLabel(s: LogSummary): string {
  if (s.compositionEvents === 0 && s.finalValue === '' && s.keydownKeys.length === 0) return '아직 입력 없음'
  if (s.compositionEvents === 0) return '조합 없이 바로 입력'
  if (s.targetInComposition) return '조합 중에 그 언어 글자가 보여요'
  if (s.latinInComposition) return '로마자로 조합해요'
  return '조합은 있지만 글자가 안 보여요'
}
