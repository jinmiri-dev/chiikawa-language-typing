/**
 * 기기 번역(크롬·엣지에 들어 있는 번역기, 무료·한도 없음·기기 안에서 번역).
 * 서버 AI 의 하루 한도가 다 찼을 때 한국어 뜻과 낱말 뜻을 채운다. 지원하지 않는 브라우저·언어면 null.
 */
import type { Lang } from '../engine/lang'

interface DeviceTranslator {
  translate(text: string): Promise<string>
}
interface TranslatorApi {
  availability(o: { sourceLanguage: string; targetLanguage: string }): Promise<string>
  create(o: { sourceLanguage: string; targetLanguage: string }): Promise<DeviceTranslator>
}

/** 브라우저에 따라 번역기 준비가 끝나지 않을 때가 있어 기다리는 시간을 정해 둔다 */
const within = <T,>(p: Promise<T>, ms: number): Promise<T | null> => Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))])

type Side = Lang | 'ko'
const CODE: Record<Side, string> = { en: 'en', ja: 'ja', zh: 'zh', tw: 'zh-Hant', mn: 'mn', ko: 'ko' }
const made = new Map<string, Promise<DeviceTranslator | null>>()

function translator(from: Side, to: Side): Promise<DeviceTranslator | null> {
  const pair = `${from}>${to}`
  let p = made.get(pair)
  if (!p) {
    p = (async () => {
      const api = (globalThis as { Translator?: TranslatorApi }).Translator
      if (!api?.create) return null
      const o = { sourceLanguage: CODE[from], targetLanguage: CODE[to] }
      try {
        const a = await within(api.availability(o), 3000)
        if (!a || a === 'unavailable') return null
        // 처음이면 번역 모델을 받느라 시간이 걸린다
        return await within(api.create(o), a === 'available' ? 5000 : 60000)
      } catch {
        return null
      }
    })()
    made.set(pair, p)
    // 처음엔 사용자가 누른 뒤에만 만들 수 있어 실패할 수 있다: 실패하면 다음에 다시 해 본다
    void p.then((t) => {
      if (!t) made.delete(pair)
    })
  }
  return p
}

const memo = new Map<string, string>()

/** 기기 번역. 못 하면 null (몽골어처럼 기기가 모르는 언어도 null) */
export async function translateOnDevice(from: Side, to: Side, text: string): Promise<string | null> {
  const key = `${from}>${to}|${text}`
  const hit = memo.get(key)
  if (hit) return hit
  const t = await translator(from, to)
  if (!t) return null
  try {
    const ko = ((await within(t.translate(text), 8000)) ?? '').trim()
    if (!ko || ko === text) return null
    memo.set(key, ko)
    return ko
  } catch {
    return null
  }
}

/** 한국어로. 못 하면 null */
export const toKorean = (lang: Lang, text: string) => translateOnDevice(lang, 'ko', text)

/** 빠진 줄만 차례로 채운다. 하나라도 실패하면(기기 번역이 없으면) 거기서 멈춘다. 채운 줄 수를 돌려준다 */
export async function fillLines<T>(lines: T[], has: (l: T) => boolean, src: (l: T) => string, put: (i: number, text: string) => void, from: Side, to: Side): Promise<number> {
  let n = 0
  for (let i = 0; i < lines.length; i++) {
    if (has(lines[i])) continue
    const t = await translateOnDevice(from, to, src(lines[i]))
    if (!t) break
    put(i, t)
    n++
  }
  return n
}
