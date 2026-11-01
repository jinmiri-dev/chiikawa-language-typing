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

/** 로마자 n글자를 친 뒤의 단계 위치(Shift 처럼 글자가 없는 단계는 건너뛴다) */
function stepAfterRomaji(steps: KeyStep[], n: number): number {
  let typed = 0
  for (let i = 0; i < steps.length; i++) {
    if (typed === n && steps[i].text !== '') return i
    if (steps[i].text.length === 1) typed++
  }
  return steps.length
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
  const reading = seg.reading ?? seg.text
  const head = seg.text !== reading ? `${seg.text} → ${reading}` : reading
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
  const tail = seg.text === reading ? '' : layout.device === 'pc' ? ' → Space로 변환, Enter로 확정' : ` → 후보에서 ${seg.text} 선택`
  return `${head} → ${body}${tail}`
}

/** 화면 읽기용: "다음: は 키를 오른쪽으로" */
export function stepSpeech(layout: Layout, step: KeyStep | undefined): string {
  if (!step) return ''
  const key = layout.rows.flat().find((k) => k.id === step.keyId)?.label ?? step.keyId
  const how: Record<Gesture, string> = { tap: '누르기', left: '왼쪽으로', up: '위로', right: '오른쪽으로', down: '아래로' }
  if (step.taps && step.taps > 1) return `다음: ${key} 키를 ${step.taps}번`
  return `다음: ${key} 키${step.gesture && step.gesture !== 'tap' ? `를 ${how[step.gesture]}` : ''}`
}
