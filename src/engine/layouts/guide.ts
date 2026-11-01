/** 지금 칠 키 안내 (기획안 11.3): 키 순서, 조합 중 글자로 본 다음 키 위치, 한 줄 안내 문구. */
import { KANA_KEYS } from '../ja/kana12'
import { kanaUnits, romajiKeys } from '../ja/romaji'
import type { Segment } from '../types'
import { keySteps } from './index'
import type { Gesture, KeyStep, Layout } from './types'

const ROW_NAME: Record<string, string> = Object.fromEntries(KANA_KEYS.map(([id, chars]) => [id, id === 'punct' ? '기호' : `${chars[0]}행`]))
const GESTURE: Record<Gesture, string> = { tap: '탭', left: '←', up: '↑', right: '→', down: '↓' }
const SMALL = 'ぁぃぅぇぉっゃゅょゎ'
const isRomaji = (l: Layout) => l.id === 'ja-pc-romaji' || l.id === 'ja-mobile-romaji'

function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

/** 글자 n개를 친 뒤의 단계 위치. 다음 글자가 Shift 와 함께면 Shift 단계부터. */
function stepAfterRomaji(steps: KeyStep[], n: number): number {
  let typed = 0
  for (let i = 0; i < steps.length; i++) {
    if (typed === n) return i
    if (steps[i].text.length === 1) typed++
  }
  return steps.length
}

/** 일본어 밖: 단계의 글자를 이은 것과 지금까지 친(조합 중) 글자를 비교한다 */
function guideOther(layout: Layout, seg: Segment, composing: string): { steps: KeyStep[]; nextIndex: number; matches: boolean } {
  const { steps } = keySteps(layout, seg)
  const pinyin = /pinyin/.test(layout.id)
  const comp = (pinyin ? composing.replace(/[\s']/g, '') : composing).toLowerCase()
  const target = steps.filter((s) => s.text.length === 1).map((s) => s.text).join('').toLowerCase()
  let at = 0
  while (at < comp.length && comp[at] === target[at]) at++
  return { steps, nextIndex: stepAfterRomaji(steps, at), matches: at === comp.length }
}

const KEY_NAME: Record<string, string> = {
  space: 'Space', shift: 'Shift', semicolon: ';', comma: ',', period: '.', slash: '/', minus: '-', quote: "'",
  bracketleft: '[', bracketright: ']', equal: '=', backquote: '`', sym: '기호',
}
const keyName = (id: string) => KEY_NAME[id] ?? (/^k\d$/.test(id) ? id.slice(1) : id.length === 1 ? id.toUpperCase() : id)

/** 키 단계 → `Shift+H E L L O` */
function keysText(steps: KeyStep[]): string {
  const out: string[] = []
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].keyId === 'shift' && steps[i + 1]) out.push(`Shift+${keyName(steps[++i].keyId)}`)
    else out.push(keyName(steps[i].keyId))
  }
  return out.join(' ')
}

function otherText(layout: Layout, seg: Segment): string {
  const steps = keySteps(layout, seg).steps
  const han = /\p{Script=Han}/u.test(seg.text)
  if (layout.lang === 'mn') {
    const head = `${seg.text}${seg.romaji ? ` (${seg.romaji})` : ''}`
    if (layout.device === 'mobile') return `${head} → ${[...seg.text].join(' ')}`
    const parts: string[] = []
    for (let i = 0; i < steps.length; i++) {
      const shift = steps[i].keyId === 'shift'
      const s = shift ? steps[++i] : steps[i]
      parts.push(`${s.text}(${shift ? 'Shift+' : ''}${keyName(s.keyId)})`)
    }
    return `${head} → ${parts.join(' ')}`
  }
  if (!han) return `${seg.text} → ${keysText(steps)}`
  if (layout.id.startsWith('tw-zhuyin')) {
    const keys = layout.device === 'pc' ? keysText(steps) : steps.map((s) => (s.keyId === 'space' ? '공백' : s.keyId)).join(' ')
    return `${seg.text} → ${seg.zhuyin} → ${keys} → ${layout.device === 'pc' ? 'Enter로 확정' : `후보에서 ${seg.text} 선택`}`
  }
  const keys = keysText(steps.filter((s) => s.text !== '후보'))
  return `${seg.text} → ${seg.reading} → ${keys} → ${layout.device === 'pc' && layout.id !== 'zh-pinyin-9key' ? 'Space로 후보 선택' : `후보에서 ${seg.text} 선택`}`
}

/** 가나 k글자를 다 친 뒤의 단계 위치. 꾸밈 키(゛゜小)가 뒤따르면 그것까지 쳐야 한 글자다. */
function stepAfterKana(steps: KeyStep[], k: number): number {
  let done = 0
  for (let i = 0; i < steps.length; i++) {
    if (done === k) return i
    if (steps[i].keyId === 'mod' || steps[i + 1]?.keyId !== 'mod') done++
  }
  return steps.length
}

export function guideFor(layout: Layout, seg: Segment, composing: string): { steps: KeyStep[]; nextIndex: number; matches: boolean } {
  try {
    return guideForUnsafe(layout, seg, composing)
  } catch {
    return { steps: keySteps(layout, seg).steps, nextIndex: 0, matches: true }
  }
}

function guideForUnsafe(layout: Layout, seg: Segment, composing: string): { steps: KeyStep[]; nextIndex: number; matches: boolean } {
  if (layout.lang !== 'ja') return guideOther(layout, seg, composing)
  const { steps } = keySteps(layout, seg)
  const reading = toHiragana(seg.reading ?? seg.text)
  const comp = toHiragana(composing)
  if (!comp) return { steps, nextIndex: 0, matches: true }

  if (/[a-z]/i.test(comp)) {
    const kana = [...comp].filter((c) => /[ぁ-ゖー]/.test(c)).join('')
    const typed = romajiKeys(kana).join('') + comp.slice(kana.length).toLowerCase()
    const target = romajiKeys(reading).join('')
    let at = 0
    while (at < typed.length && typed[at] === target[at]) at++
    return { steps, nextIndex: stepAfterRomaji(steps, at), matches: at === typed.length }
  }

  let k = 0
  while (k < comp.length && comp[k] === reading[k]) k++
  if (k === comp.length) {
    const nextIndex = isRomaji(layout) ? stepAfterRomaji(steps, romajiKeys(reading.slice(0, k)).length) : stepAfterKana(steps, k)
    return { steps, nextIndex, matches: true }
  }
  // 마지막 글자가 꾸밈 키를 기다리는 중: へ → べ, つ → っ
  const want = reading[k]
  const pending = k === comp.length - 1 && (want.normalize('NFD')[0] === comp[k] || (SMALL.includes(want) && 'あいうえおつやゆよわ'[SMALL.indexOf(want)] === comp[k]))
  if (pending && !isRomaji(layout)) {
    const at = stepAfterKana(steps, k)
    const modAt = steps.findIndex((s, i) => i > at && s.keyId === 'mod')
    return { steps, nextIndex: modAt >= 0 ? modAt : at, matches: true }
  }
  return { steps, nextIndex: isRomaji(layout) ? stepAfterRomaji(steps, romajiKeys(reading.slice(0, k)).length) : stepAfterKana(steps, k), matches: false }
}

function modMark(s: KeyStep): string {
  if (s.taps === 2) return '゜'
  return SMALL.includes(toHiragana(s.text)) ? '小' : '゛'
}

/** 한 줄 안내: `食べ → たべ → た(た행 탭) べ(は행 → + ゛) → 후보에서 食べ 선택` */
export function guideText(layout: Layout, seg: Segment): string {
  if (layout.lang !== 'ja') {
    try {
      return otherText(layout, seg)
    } catch {
      return seg.text
    }
  }
  const reading = seg.reading ?? seg.text
  const head = seg.text !== reading ? `${seg.text} → ${reading}` : reading
  let body: string
  try {
    body = bodyText(layout, seg, reading)
  } catch {
    return head // 안내할 수 없는 글자가 있으면 읽기까지만 보여 준다
  }
  const tail = seg.text === reading ? '' : layout.device === 'pc' ? ' → Space로 변환, Enter로 확정' : ` → 후보에서 ${seg.text} 선택`
  return `${head} → ${body}${tail}`
}

function bodyText(layout: Layout, seg: Segment, reading: string): string {
  let body: string
  if (isRomaji(layout)) body = romajiKeys(reading).map((c) => c.toUpperCase()).join(' ')
  else {
    const tapMode = layout.id === 'ja-tap'
    body = kanaUnits(reading)
      .map((u) => {
        const parts = keySteps(layout, { ...seg, text: u, reading: u }).steps.map((s) =>
          s.keyId === 'mod' ? modMark(s) : `${ROW_NAME[s.keyId]} ${tapMode ? `${s.taps}번` : GESTURE[s.gesture ?? 'tap']}`,
        )
        return `${u}(${parts.join(' + ')})`
      })
      .join(' ')
  }
  return body
}

/** 화면 읽기용: "다음: は 키를 오른쪽으로" */
export function stepSpeech(layout: Layout, step: KeyStep | undefined): string {
  if (!step) return ''
  const key = layout.rows.flat().find((k) => k.id === step.keyId)?.label ?? step.keyId
  const how: Record<Gesture, string> = { tap: '누르기', left: '왼쪽으로', up: '위로', right: '오른쪽으로', down: '아래로' }
  if (step.taps && step.taps > 1) return `다음: ${key} 키를 ${step.taps}번`
  return `다음: ${key} 키${step.gesture && step.gesture !== 'tap' ? `를 ${how[step.gesture]}` : ''}`
}
