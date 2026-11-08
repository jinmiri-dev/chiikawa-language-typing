/**
 * 무료 번역: Cloudflare Workers AI(하루 무료 사용량 안). 자막에 한국어(또는 학습자 모국어)가 없을 때 뜻을 채운다.
 * 한 번 부를 때 바깥 요청 수에 상한(무료 50)이 있어, 여러 줄을 한 번에 번역하는 대화형 모델을 먼저 쓰고
 * (줄 수가 맞는지 확인), 어긋난 묶음만 번역 전용 모델로 한 줄씩 다시 한다. 실패하면 null — 뜻 없이도 연습은 된다.
 */
import type { Deps, Env } from './env'
import type { SrcLang } from './transcript'

const NAME: Record<SrcLang, string> = { ko: 'Korean', ja: 'Japanese', en: 'English', zh: 'Simplified Chinese', tw: 'Traditional Chinese (Taiwan)', mn: 'Mongolian (Cyrillic)' }
const CODE: Record<SrcLang, string> = { ko: 'ko', ja: 'ja', en: 'en', zh: 'zh', tw: 'zh', mn: 'mn' }
const CHAT = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast']
const LINE_MODEL = '@cf/meta/m2m100-1.2b'
const CHUNK = 20
/** 그 언어 뜻에 남으면 안 되는 글자 */
const STRAY: Partial<Record<SrcLang, RegExp>> = {
  ko: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Cyrillic}]/u,
  mn: /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  en: /[\p{Script=Han}\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  ja: /\p{Script=Hangul}/u,
  zh: /[\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  tw: /[\p{Script=Hangul}\p{Script=Hiragana}\p{Script=Katakana}]/u,
}
/** 번역 전용 모델(m2m100)은 몽골어를 엉뚱하게 옮겨(없는 회사 이름·나라를 지어냄) 쓰지 않는다 */
const LINE_OK = (from: SrcLang, to: SrcLang) => from !== 'mn' && to !== 'mn'

/**
 * 원문에 없는 영문 낱말(3글자 이상)이 뜻에 생기면 지어낸 번역으로 본다(예: 몽골어 기사 뜻에 "Cisco").
 * 원문이 라틴 글자(영어)거나 뜻이 라틴 글자 언어면 보지 않는다.
 */
export function inventedLatin(src: string, out: string, to: SrcLang): boolean {
  if (to === 'en') return false
  const have = new Set((src.match(/[A-Za-z]{3,}/g) ?? []).map((w) => w.toLowerCase()))
  return (out.match(/[A-Za-z]{3,}/g) ?? []).some((w) => !have.has(w.toLowerCase()))
}

/** 이 함수에서 쓸 AI 호출 수(나머지는 유튜브·가사 요청 몫) */
const BUDGET = 30

/** 모델 답에서 JSON 문자열 배열을 꺼낸다 */
export function parseArray(text: string, n: number): string[] | null {
  const m = text.match(/\[[\s\S]*\]/)
  if (!m) return null
  try {
    const a = JSON.parse(m[0]) as unknown
    if (!Array.isArray(a) || a.length !== n || a.some((x) => typeof x !== 'string')) return null
    return (a as string[]).map((s) => s.trim())
  } catch {
    return null
  }
}

export async function aiTranslate(env: Env, _deps: Deps, from: SrcLang, to: SrcLang, texts: string[]): Promise<string[] | null> {
  if (!env.AI || !texts.length) return null
  let calls = 0
  const ai = async (model: string, input: unknown) => {
    calls++
    return (await env.AI!.run(model, input)) as { response?: unknown; translated_text?: string }
  }
  const out: string[] = new Array(texts.length).fill('')
  for (let i = 0; i < texts.length && calls < BUDGET; i += CHUNK) {
    const part = texts.slice(i, i + CHUNK)
    let got: string[] | null = null
    // 몽골어는 큰 모델이 훨씬 정확하다(작은 모델은 "세계유산"을 "세계 질병"처럼 옮김)
    for (const model of from === 'mn' || to === 'mn' ? [...CHAT].reverse() : CHAT) {
      if (got || calls >= BUDGET) break
      try {
        const r = await ai(model, {
          messages: [
            {
              role: 'system',
              content: `You translate song lyrics, subtitles and news sentences from ${NAME[from]} to natural ${NAME[to]} for language learners. Translate each line faithfully; never add facts, names or words that are not in the line. Reply with only a JSON array of ${part.length} strings, one translation per input line, same order. Write only in ${NAME[to]} script; write people and place names in ${NAME[to]} script too. Never add the original or English words in parentheses. No notes.`,
            },
            { role: 'user', content: JSON.stringify(part) },
          ],
          max_tokens: 4096,
          temperature: 0.2,
        })
        const text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response ?? '')
        got = parseArray(text, part.length)
      } catch (e) {
        console.warn('ai chat failed', model, String(e))
      }
    }
    if (got) got.forEach((t, k) => (out[i + k] = inventedLatin(part[k], t, to) ? '' : t))
    else if (LINE_OK(from, to))
      for (let k = 0; k < part.length && calls < BUDGET; k++) {
        try {
          out[i + k] = ((await ai(LINE_MODEL, { text: part[k], source_lang: CODE[from], target_lang: CODE[to] })).translated_text ?? '').trim()
        } catch (e) {
          console.warn('ai line failed', String(e))
        }
      }
  }
  // 다른 글자가 섞인 줄(예: 한국어 뜻에 한자·가나가 남음)은 번역 전용 모델로 다시
  const stray = STRAY[to]
  for (let k = 0; k < out.length && stray && calls < BUDGET + 10; k++) {
    if (!out[k] || !stray.test(out[k])) continue
    if (!LINE_OK(from, to)) {
      out[k] = ''
      continue
    }
    try {
      const t = ((await ai(LINE_MODEL, { text: texts[k], source_lang: CODE[from], target_lang: CODE[to] })).translated_text ?? '').trim()
      out[k] = t && !stray.test(t) ? t : ''
    } catch {
      out[k] = ''
    }
  }
  // 된 줄만이라도 돌려준다(빈 줄은 부른 쪽이 나중에 다시 채운다)
  return out.some(Boolean) ? out : null
}
