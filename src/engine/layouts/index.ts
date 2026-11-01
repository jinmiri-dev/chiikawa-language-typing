import type { Lang } from '../lang'
import type { LayoutId, Segment } from '../types'
import { flickSteps, tapSteps } from '../ja/kana12'
import { kanaUnits, romajiKeys } from '../ja/romaji'
import { jaFlick, jaTap } from './data/ja-12key'
import { jaMobileRomaji } from './data/ja-mobile-romaji'
import { jaPcRomaji, PC_CHAR_KEYS } from './data/ja-pc-romaji'
import type { KeyStep, Layout } from './types'

export type { Gesture, KeyDef, KeyStep, Layout } from './types'

const LAYOUTS: Partial<Record<LayoutId, Layout>> = {
  'ja-pc-romaji': jaPcRomaji,
  'ja-flick': jaFlick,
  'ja-tap': jaTap,
  'ja-mobile-romaji': jaMobileRomaji,
}

/** 기획안 6장 표의 이름과 한 줄 설명 */
export const LAYOUT_LABEL: Record<LayoutId, { name: string; desc: string }> = {
  'en-qwerty': { name: '쿼티', desc: '영어 기본 자판' },
  'ja-pc-romaji': { name: 'PC 로마자 입력', desc: '로마자로 치고 Space로 변환해요' },
  'ja-flick': { name: '12키 플릭', desc: '키를 누른 채 방향으로 밀어요' },
  'ja-tap': { name: '12키 탭 반복', desc: '같은 키를 여러 번 눌러요' },
  'ja-mobile-romaji': { name: '휴대폰 로마자', desc: '쿼티 자판에서 로마자로 쳐요' },
  'zh-pinyin': { name: '병음 쿼티', desc: '병음으로 치고 후보를 골라요' },
  'zh-pinyin-9key': { name: '병음 9키', desc: '숫자 키에 묶인 글자로 쳐요' },
  'tw-zhuyin-pc': { name: 'PC 주음', desc: '大千 배열로 주음을 쳐요' },
  'tw-zhuyin-mobile': { name: '휴대폰 주음', desc: '주음 자판에서 기호를 골라요' },
  'tw-pinyin': { name: '대만 병음', desc: '병음으로 치고 번체 후보를 골라요' },
  'mn-cyrillic': { name: '몽골어 키릴', desc: 'ө·ү가 있는 몽골어 자판' },
}

export function getLayout(id: LayoutId): Layout {
  const l = LAYOUTS[id]
  if (!l) throw new Error(`아직 없는 배열: ${id}`)
  return l
}

export function layoutsFor(lang: Lang, device: 'pc' | 'mobile'): Layout[] {
  return Object.values(LAYOUTS).filter((l): l is Layout => !!l && l.lang === lang && l.device === device)
}

function romajiSteps(reading: string, pc: boolean): KeyStep[] {
  const steps: KeyStep[] = []
  for (const ch of romajiKeys(reading)) {
    if (/[a-z]/.test(ch)) steps.push({ keyId: ch, text: ch })
    else if (pc) {
      const keys = PC_CHAR_KEYS[ch] ?? []
      keys.forEach((k, i) => steps.push({ keyId: k, text: i === keys.length - 1 ? ch : '' }))
    } else steps.push({ keyId: ch === ' ' ? 'space' : 'sym', text: ch })
  }
  return steps
}

/** 조각 하나를 치는 키 순서 (프론트-설계 5장) */
export function keySteps(layout: Layout, seg: Segment): { steps: KeyStep[]; convert?: string; confident: boolean } {
  const reading = seg.reading ?? seg.text
  const convert = seg.text !== reading ? seg.text : undefined
  let steps: KeyStep[]
  // 읽기를 모르는 조각(한자가 그대로 남은 읽기 등)은 키를 알 수 없으니 안내하지 않는다
  if (!seg.confident) return { steps: [], confident: false }
  try {
    steps = stepsFor(layout, reading, convert)
  } catch {
    return { steps: [], confident: false }
  }
  return { steps, ...(convert ? { convert } : {}), confident: true }
}

function stepsFor(layout: Layout, reading: string, convert: string | undefined): KeyStep[] {
  let steps: KeyStep[]
  switch (layout.id) {
    case 'ja-pc-romaji':
      steps = romajiSteps(reading, true)
      if (convert) steps.push({ keyId: 'space', text: '변환' }, { keyId: 'enter', text: '확정' })
      break
    case 'ja-mobile-romaji':
      steps = romajiSteps(reading, false)
      break
    case 'ja-flick':
      steps = kanaUnits(reading).flatMap(flickSteps)
      break
    case 'ja-tap':
      steps = kanaUnits(reading).flatMap(tapSteps)
      break
    default:
      throw new Error(`키 순서를 아직 모르는 배열: ${layout.id}`)
  }
  return steps
}
