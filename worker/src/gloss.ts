/**
 * POST /gloss — 낱말 짝: 원문 줄의 낱말과 한국어 뜻 속 그 낱말의 뜻을 짝지어 준다(타자 치며 단어가 함께 외워지게).
 * 몸은 text/plain JSON {lines:[{src,ko}]} (미리 요청 없이 보내려고). 줄마다 한 번 만들면 기한 없이 저장한다.
 * 원문 낱말이 정말 그 줄에 있는 것만 남긴다(엉뚱한 짝을 보여 주지 않게).
 */
import { cachedJson, putJson, sha } from './cache'
import type { Deps, Env, Lang } from './env'
import { ApiError, json } from './http'
import { takeQuota } from './quota'

const NAME: Record<Lang, string> = { ja: 'Japanese', en: 'English', zh: 'Simplified Chinese', tw: 'Traditional Chinese', mn: 'Mongolian (Cyrillic)' }
const MODELS = ['@cf/meta/llama-4-scout-17b-16e-instruct', '@cf/meta/llama-3.3-70b-instruct-fp8-fast']
const MAX_LINES = 12
const MAX_LEN = 160

export type Pair = [src: string, ko: string]

/** 모델 답 → 줄마다 [원문 낱말, 한국어 뜻] 목록. 원문에 없는 낱말·빈 뜻은 버리고, 같은 낱말은 한 번만 */
export function cleanPairs(raw: unknown, src: string): Pair[] {
  if (!Array.isArray(raw)) return []
  const out: Pair[] = []
  const seen = new Set<string>()
  for (const p of raw) {
    if (!Array.isArray(p) || typeof p[0] !== 'string' || typeof p[1] !== 'string') continue
    const s = p[0].trim()
    const k = p[1].trim()
    if (!s || !k || k.length > 20 || !src.includes(s) || seen.has(s) || /^[\p{P}\s]+$/u.test(s)) continue
    seen.add(s)
    out.push([s, k])
  }
  return out
}

export async function gloss(body: string, lang: Lang, env: Env, deps: Deps): Promise<Response> {
  let lines: { src: string; ko: string }[]
  try {
    const parsed = JSON.parse(body) as { lines?: unknown }
    lines = (Array.isArray(parsed.lines) ? parsed.lines : [])
      .filter((l): l is { src: string; ko: string } => !!l && typeof (l as { src: unknown }).src === 'string' && typeof (l as { ko: unknown }).ko === 'string')
      .slice(0, MAX_LINES)
      .map((l) => ({ src: l.src.slice(0, MAX_LEN), ko: l.ko.slice(0, MAX_LEN) }))
  } catch {
    throw new ApiError('BAD_REQUEST', '줄 목록이 잘못됐어요.')
  }
  if (!lines.length) throw new ApiError('BAD_REQUEST', '줄이 없어요.')

  const keys = await Promise.all(lines.map(async (l) => `gloss:v1:${lang}:${(await sha(`${l.src}\u0000${l.ko}`)).slice(0, 32)}`))
  const found = await Promise.all(keys.map((k) => cachedJson<Pair[]>(env.KV, k)))
  const missing = lines.map((l, i) => ({ l, i })).filter((x) => !found[x.i])
  if (missing.length && env.AI) {
    // 낱말 짝은 있으면 좋은 정도라 하루 1,500줄까지만(AI 하루 무료 양을 뉴스·영상 뜻에 남겨 둔다)
    const quota = await takeQuota(env.KV, 'gloss', 1_500, deps.now(), missing.length, deps.ip)
    if (quota.ok) {
      const made = await ask(env, lang, missing.map((m) => m.l))
      if (made)
        await Promise.all(
          missing.map(async (m, j) => {
            const pairs = cleanPairs(made[j], m.l.src)
            found[m.i] = pairs
            if (pairs.length) await putJson(env.KV, keys[m.i], pairs)
          }),
        )
    }
  }
  return json({ items: found.map((f) => f ?? []) })
}

async function ask(env: Env, lang: Lang, lines: { src: string; ko: string }[]): Promise<unknown[] | null> {
  const system =
    `You align ${NAME[lang]} sentences with their Korean translations for language learners. ` +
    'For each item, list the content words of the source sentence in order (nouns, verbs, adjectives, adverbs, set phrases; skip particles and punctuation). ' +
    'Each entry is [source, korean]: source copied exactly as it appears in the source sentence (keep inflection), korean = the matching words copied exactly from the Korean sentence; ' +
    'if the Korean sentence has no matching words, give a short Korean dictionary meaning instead. ' +
    `Reply with only a JSON array with one array of entries per item (${lines.length} items), same order.`
  for (const model of MODELS) {
    try {
      const r = (await env.AI!.run(model, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: JSON.stringify(lines.map((l) => ({ source: l.src, korean: l.ko }))) },
        ],
        max_tokens: 3000,
        temperature: 0.1,
      })) as { response?: unknown }
      const text = typeof r.response === 'string' ? r.response : JSON.stringify(r.response ?? '')
      const m = text.match(/\[[\s\S]*\]/)
      if (!m) continue
      const arr = JSON.parse(m[0]) as unknown
      if (Array.isArray(arr) && arr.length === lines.length) return arr
    } catch (e) {
      console.warn('gloss failed', model, String(e))
    }
  }
  return null
}
