/** 하루 상한 (기획안 8장, 아키텍처-API-ERD 5장): `quota:{route}:{YYYY-MM-DD}` 에 오늘 사용량. UTC 자정에 새로 시작. */
import type { KV } from './env'

const DAY = 86_400_000

export const LIMITS = { search: 90, transcript: 60, tts: 20_000, netflix: 50 } as const
export type QuotaRoute = keyof typeof LIMITS

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)
const secondsToReset = (now: number) => Math.ceil((Math.floor(now / DAY) * DAY + DAY - now) / 1000)

/** amount 만큼 쓴다. 넘으면 쓰지 않고 ok:false. (KV 는 원자적이지 않아 아주 조금 넘을 수 있다) */
export async function takeQuota(kv: KV, route: QuotaRoute | string, limit: number, now: number, amount = 1) {
  const key = `quota:${route}:${dayOf(now)}`
  const used = Number((await kv.get(key)) ?? 0)
  const resetSec = secondsToReset(now)
  if (used + amount > limit) return { ok: false, remaining: Math.max(0, limit - used), resetSec }
  await kv.put(key, String(used + amount), { expirationTtl: 2 * 86_400 })
  return { ok: true, remaining: limit - used - amount, resetSec }
}

export const quotaHeaders = (q: { remaining: number; resetSec: number }) => ({
  'x-quota-remaining': String(q.remaining),
  'x-quota-reset': String(q.resetSec),
})
