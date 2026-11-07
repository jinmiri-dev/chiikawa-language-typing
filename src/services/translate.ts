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

const CODE: Record<Lang, string> = { en: 'en', ja: 'ja', zh: 'zh', tw: 'zh-Hant', mn: 'mn' }
const made = new Map<Lang, Promise<DeviceTranslator | null>>()

function translator(lang: Lang): Promise<DeviceTranslator | null> {
  let p = made.get(lang)
  if (!p) {
    p = (async () => {
      const api = (globalThis as { Translator?: TranslatorApi }).Translator
      if (!api?.create) return null
      const o = { sourceLanguage: CODE[lang], targetLanguage: 'ko' }
      try {
        const a = await within(api.availability(o), 3000)
        if (!a || a === 'unavailable') return null
        // 처음이면 번역 모델을 받느라 시간이 걸린다
        return await within(api.create(o), a === 'available' ? 5000 : 60000)
      } catch {
        return null
      }
    })()
    made.set(lang, p)
    // 처음엔 사용자가 누른 뒤에만 만들 수 있어 실패할 수 있다: 실패하면 다음에 다시 해 본다
    void p.then((t) => {
      if (!t) made.delete(lang)
    })
  }
  return p
}

const memo = new Map<string, string>()

/** 한국어로. 못 하면 null */
export async function toKorean(lang: Lang, text: string): Promise<string | null> {
  const key = `${lang}|${text}`
  const hit = memo.get(key)
  if (hit) return hit
  const t = await translator(lang)
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
