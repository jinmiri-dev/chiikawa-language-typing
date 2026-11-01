/** 휴대폰 12키(플릭·탭 반복) 입력 순서 (기획안 11.4). */
import type { Gesture, KeyStep } from '../layouts/types'

/** 행 키와 그 키의 글자(탭 1번, 2번 …). 플릭은 앞에서부터 탭·←·↑·→·↓ */
export const KANA_KEYS: [string, string[]][] = [
  ['a', ['あ', 'い', 'う', 'え', 'お']],
  ['ka', ['か', 'き', 'く', 'け', 'こ']],
  ['sa', ['さ', 'し', 'す', 'せ', 'そ']],
  ['ta', ['た', 'ち', 'つ', 'て', 'と']],
  ['na', ['な', 'に', 'ぬ', 'ね', 'の']],
  ['ha', ['は', 'ひ', 'ふ', 'へ', 'ほ']],
  ['ma', ['ま', 'み', 'む', 'め', 'も']],
  ['ya', ['や', 'ゆ', 'よ']],
  ['ra', ['ら', 'り', 'る', 'れ', 'ろ']],
  ['wa', ['わ', 'を', 'ん', 'ー']],
  ['punct', ['、', '。', '？', '！']],
]
const FLICK: Gesture[] = ['tap', 'left', 'up', 'right', 'down']
// や행은 ゆ가 ↑, よ가 ↓ 이다
const YA_FLICK: Gesture[] = ['tap', 'up', 'down']

/** 꾸밈 키(゛゜小) 를 몇 번 눌러 바뀌는가 */
const MOD: Record<string, [string, number]> = {}
const DAKU = 'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ'
const DAKU_BASE = 'かきくけこさしすせそたちつてとはひふへほう'
;[...DAKU].forEach((d, i) => (MOD[d] = [DAKU_BASE[i], 1]))
;[...'ぱぴぷぺぽ'].forEach((p, i) => (MOD[p] = ['はひふへほ'[i], 2]))
;[...'ぁぃぅぇぉっゃゅょゎ'].forEach((s, i) => (MOD[s] = ['あいうえおつやゆよわ'[i], 1]))

const ALIAS: Record<string, string> = { '!': '！', '?': '？' }

function toHiragana(s: string): string {
  return s.replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

function locate(kana: string): { keyId: string; index: number } {
  for (const [keyId, chars] of KANA_KEYS) {
    const index = chars.indexOf(kana)
    if (index >= 0) return { keyId, index }
  }
  throw new Error(`12키로 칠 수 없는 글자: ${kana}`)
}

function steps(unit: string, base: (kana: string) => KeyStep): KeyStep[] {
  const out: KeyStep[] = []
  for (const raw of toHiragana(unit)) {
    const ch = ALIAS[raw] ?? raw
    const mod = MOD[ch]
    if (mod) {
      out.push(base(mod[0]))
      out.push({ keyId: 'mod', gesture: 'tap', taps: mod[1], text: ch })
    } else out.push(base(ch))
  }
  return out
}

export function flickSteps(unit: string): KeyStep[] {
  return steps(unit, (kana) => {
    const { keyId, index } = locate(kana)
    return { keyId, gesture: (keyId === 'ya' ? YA_FLICK : FLICK)[index], text: kana }
  })
}

export function tapSteps(unit: string): KeyStep[] {
  return steps(unit, (kana) => {
    const { keyId, index } = locate(kana)
    return { keyId, gesture: 'tap', taps: index + 1, text: kana }
  })
}
