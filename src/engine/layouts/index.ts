import type { Lang } from '../lang'
import type { LayoutId, Segment } from '../types'
import { flickSteps, tapSteps } from '../ja/kana12'
import { kanaUnits, romajiKeys } from '../ja/romaji'
import { jaFlick, jaTap } from './data/ja-12key'
import { jaMobileRomaji } from './data/ja-mobile-romaji'
import { jaPcRomaji, PC_CHAR_KEYS } from './data/ja-pc-romaji'
import {
  DAQIAN, enQwerty, enQwertyMobile, MN_KEYS, mnCyrillic, mnCyrillicMobile, NINE_KEY,
  twPinyin, twPinyinMobile, twZhuyinMobile, twZhuyinPc, zhPinyin, zhPinyin9key, zhPinyinMobile,
} from './data/others'
import { toneless } from '../reading/zhuyin'
import type { KeyStep, Layout } from './types'

export type { Gesture, KeyDef, KeyStep, Layout } from './types'

/** 넣은 순서가 키보드 고르기 목록 순서다 */
const LAYOUTS: Record<LayoutId, Layout> = {
  'ja-pc-romaji': jaPcRomaji,
  'ja-flick': jaFlick,
  'ja-tap': jaTap,
  'ja-mobile-romaji': jaMobileRomaji,
  'en-qwerty': enQwerty,
  'en-qwerty-mobile': enQwertyMobile,
  'zh-pinyin': zhPinyin,
  'zh-pinyin-mobile': zhPinyinMobile,
  'zh-pinyin-9key': zhPinyin9key,
  'tw-zhuyin-pc': twZhuyinPc,
  'tw-pinyin': twPinyin,
  'tw-zhuyin-mobile': twZhuyinMobile,
  'tw-pinyin-mobile': twPinyinMobile,
  'mn-cyrillic': mnCyrillic,
  'mn-cyrillic-mobile': mnCyrillicMobile,
}

/** 언어·기기마다 처음 고르는 배열 */
export const DEFAULT_LAYOUT: Record<Lang, Record<'pc' | 'mobile', LayoutId>> = {
  ja: { pc: 'ja-pc-romaji', mobile: 'ja-flick' },
  en: { pc: 'en-qwerty', mobile: 'en-qwerty-mobile' },
  zh: { pc: 'zh-pinyin', mobile: 'zh-pinyin-mobile' },
  tw: { pc: 'tw-zhuyin-pc', mobile: 'tw-zhuyin-mobile' },
  mn: { pc: 'mn-cyrillic', mobile: 'mn-cyrillic-mobile' },
}

/** 기획안 6장 표의 이름과 한 줄 설명 */
export const LAYOUT_LABEL: Record<LayoutId, { name: string; desc: string }> = {
  'en-qwerty': { name: 'PC 쿼티', desc: '영어 기본 자판' },
  'en-qwerty-mobile': { name: '휴대폰 쿼티', desc: '휴대폰 영어 자판' },
  'zh-pinyin-mobile': { name: '휴대폰 병음 쿼티', desc: '쿼티 자판에서 병음으로 쳐요' },
  'tw-pinyin-mobile': { name: '휴대폰 병음', desc: '쿼티 자판에서 병음으로 치고 번체를 골라요' },
  'mn-cyrillic-mobile': { name: '휴대폰 키릴', desc: '휴대폰 몽골어 자판' },
  'ja-pc-romaji': { name: 'PC 로마자 입력', desc: '로마자로 치고 Space로 변환해요' },
  'ja-flick': { name: '12키 플릭', desc: '키를 누른 채 방향으로 밀어요' },
  'ja-tap': { name: '12키 탭 반복', desc: '같은 키를 여러 번 눌러요' },
  'ja-mobile-romaji': { name: '휴대폰 로마자', desc: '쿼티 자판에서 로마자로 쳐요' },
  'zh-pinyin': { name: 'PC 병음', desc: '병음으로 치고 Space로 후보를 골라요' },
  'zh-pinyin-9key': { name: '병음 9키', desc: '숫자 키에 묶인 글자로 쳐요' },
  'tw-zhuyin-pc': { name: 'PC 주음', desc: '大千 배열로 주음을 쳐요' },
  'tw-zhuyin-mobile': { name: '휴대폰 주음', desc: '주음 자판에서 기호를 골라요' },
  'tw-pinyin': { name: 'PC 병음', desc: '병음으로 치고 번체 후보를 골라요' },
  'mn-cyrillic': { name: '몽골어 키릴', desc: 'ө·ү가 있는 몽골어 자판' },
}

export function getLayout(id: LayoutId): Layout {
  const l = LAYOUTS[id]
  if (!l) throw new Error(`없는 배열: ${id}`)
  return l
}

export function layoutsFor(lang: Lang, device: 'pc' | 'mobile'): Layout[] {
  return Object.values(LAYOUTS).filter((l) => l.lang === lang && l.device === device)
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
    steps = layout.lang === 'ja' ? stepsFor(layout, reading, convert) : otherSteps(layout, seg)
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

const HAN = /\p{Script=Han}/u
const invert = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).map(([k, v]) => [v, k]))
const ZHUYIN_KEY = invert(DAQIAN)
const MN_KEY = invert(MN_KEYS)
const TONE_KEY: Record<string, string> = { 'ˊ': '6', 'ˇ': '3', 'ˋ': '4', '˙': '7' }
/** 전각 문장부호 → PC 키 (중국어 입력기에서 같은 키로 친다) */
const FULL: Record<string, string> = { '，': ',', '。': '.', '？': '?', '！': '!', '：': ':', '；': ';', '、': '/', '“': '"', '”': '"', '（': '(', '）': ')' }

/** 글자 하나를 PC 키로. 대문자는 Shift */
function pcChar(c: string, keyOf: (lower: string) => string | undefined): KeyStep[] {
  const low = c.toLowerCase()
  const k = keyOf(low)
  if (k) return c !== low ? [{ keyId: 'shift', text: '' }, { keyId: k, text: c }] : [{ keyId: k, text: c }]
  const keys = PC_CHAR_KEYS[FULL[c] ?? c]
  if (!keys) throw new Error(`키를 모르는 글자: ${c}`)
  return keys.map((id, i) => ({ keyId: id, text: i === keys.length - 1 ? c : '' }))
}
/** 휴대폰: 글자 키 밖은 기호 키에서 고른다 */
function mobileChar(c: string, keyOf: (lower: string) => string | undefined): KeyStep[] {
  const low = c.toLowerCase()
  const k = keyOf(low)
  if (k) return c !== low ? [{ keyId: 'shift', text: '' }, { keyId: k, text: c }] : [{ keyId: k, text: c }]
  return [{ keyId: c === ' ' ? 'space' : 'sym', text: c }]
}
const latin = (c: string) => (/^[a-z]$/.test(c) ? c : undefined)

/** 주음 한 음절(`ㄋㄧˇ`, `˙ㄇㄚ`, 1성은 부호 없음) → 기호 키와 성조 키 */
function zhuyinSyllable(syl: string, pc: boolean): KeyStep[] {
  const neutral = syl.startsWith('˙')
  const body = [...syl.replace('˙', '')]
  const tone = body.length && TONE_KEY[body[body.length - 1]] ? body.pop()! : neutral ? '˙' : ''
  const steps: KeyStep[] = body.map((s) => ({ keyId: pc ? ZHUYIN_KEY[s] : s, text: s }))
  if (steps.some((s) => !s.keyId)) throw new Error(`주음 키를 모름: ${syl}`)
  steps.push(tone ? { keyId: pc ? TONE_KEY[tone] : tone, text: tone } : { keyId: 'space', text: '' })
  return steps
}

function otherSteps(layout: Layout, seg: Segment): KeyStep[] {
  const chars = [...seg.text]
  const pc = layout.device === 'pc'
  const per = (fn: (c: string) => KeyStep[]) => chars.flatMap(fn)
  const han = HAN.test(seg.text)
  switch (layout.id) {
    case 'en-qwerty':
      return per((c) => pcChar(c, latin))
    case 'en-qwerty-mobile':
      return per((c) => mobileChar(c, latin))
    case 'mn-cyrillic':
      return per((c) => pcChar(c, (l) => MN_KEY[l]))
    case 'mn-cyrillic-mobile':
      return per((c) => mobileChar(c, (l) => (MN_KEY[l] ? MN_KEY[l] : undefined)))
    case 'zh-pinyin':
    case 'tw-pinyin':
    case 'zh-pinyin-mobile':
    case 'tw-pinyin-mobile':
      if (!han) return per((c) => (pc ? pcChar(c, latin) : mobileChar(c, latin)))
      return [...[...toneless(seg.reading ?? '')].map((c) => ({ keyId: c, text: c })), ...(pc ? [{ keyId: 'space', text: '후보' }] : [])]
    case 'zh-pinyin-9key':
      if (!han) return per((c) => [{ keyId: /[，。？]/.test(c) ? 'k1' : 'sym', text: c }])
      return [...toneless(seg.reading ?? '')].map((c) => ({ keyId: NINE_KEY[c], text: c }))
    case 'tw-zhuyin-pc':
    case 'tw-zhuyin-mobile':
      if (!han) return per((c) => (pc ? pcChar(c, () => undefined) : mobileChar(c, () => undefined)))
      if (!seg.zhuyin) throw new Error('주음이 없는 조각')
      return seg.zhuyin.split(' ').flatMap((s) => zhuyinSyllable(s, pc))
    default:
      throw new Error(`키 순서를 모르는 배열: ${layout.id}`)
  }
}
