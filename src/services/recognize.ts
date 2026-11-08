/**
 * 따라 말하기 채점: 브라우저 음성 인식(크롬·엣지·사파리)으로 들은 말을 원문과 견준다.
 * 크롬은 소리를 구글 서버로 보내 글자로 바꾼다(이 사이트는 소리를 저장하지 않는다). 지원하지 않으면 버튼을 숨긴다.
 */
import type { Lang } from '../engine/lang'

interface Rec {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
type RecCtor = new () => Rec

const CODE: Record<Lang, string> = { ja: 'ja-JP', en: 'en-US', zh: 'zh-CN', tw: 'zh-TW', mn: 'mn-MN' }

function ctor(): RecCtor | null {
  const g = globalThis as { SpeechRecognition?: RecCtor; webkitSpeechRecognition?: RecCtor }
  return g.SpeechRecognition ?? g.webkitSpeechRecognition ?? null
}
export const canRecognize = () => !!ctor()

/** 한 번 듣고 후보 글들을 돌려준다(못 들으면 빈 배열). 10초가 지나면 멈춘다 */
export function recognize(lang: Lang): Promise<string[]> {
  const C = ctor()
  if (!C) return Promise.resolve([])
  return new Promise((resolve) => {
    const r = new C()
    r.lang = CODE[lang]
    r.interimResults = false
    r.maxAlternatives = 3
    let out: string[] = []
    const timer = setTimeout(() => r.stop(), 10_000)
    r.onresult = (e) => {
      const first = e.results[0]
      out = first ? Array.from({ length: first.length }, (_, i) => first[i].transcript) : []
    }
    r.onerror = () => undefined
    r.onend = () => {
      clearTimeout(timer)
      resolve(out)
    }
    try {
      r.start()
    } catch {
      clearTimeout(timer)
      resolve([])
    }
  })
}

/** 견줄 글: 문장부호·띄어쓰기를 빼고 소문자로(전각은 반각으로) */
const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\s]/gu, '')

/** 원문과 들은 말이 얼마나 같은가(0~100, 글자 편집 거리로) */
export function matchScore(target: string, heard: string): number {
  const a = [...norm(target)]
  const b = [...norm(heard)]
  if (!a.length) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    prev = cur
  }
  return Math.max(0, Math.round((1 - prev[b.length] / Math.max(a.length, b.length)) * 100))
}

/** 후보 가운데 가장 잘 맞는 것 */
export function bestMatch(target: string, heard: string[]): { text: string; score: number } | null {
  let best: { text: string; score: number } | null = null
  for (const h of heard) {
    const score = matchScore(target, h)
    if (!best || score > best.score) best = { text: h, score }
  }
  return best
}
