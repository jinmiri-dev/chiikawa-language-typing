/** 하루 상한 (기획안 8장, 아키텍처-API-ERD 5장): `quota:{route}:{YYYY-MM-DD}` 에 오늘 사용량. UTC 자정에 새로 시작. */
import { sha } from './cache'
import type { KV } from './env'

const DAY = 86_400_000

export const LIMITS = { search: 90, transcript: 300, tts: 20_000, netflix: 50 } as const
/** 한 사람(IP) 하루 상한: 누가 출처를 꾸며 불러도 전체 한도(자막 서비스 무료 횟수)를 혼자 다 쓰지 못하게 */
export const IP_LIMITS: Record<string, number> = { search: 30, transcript: 40, tts: 5_000, netflix: 20 }
export type QuotaRoute = keyof typeof LIMITS

const dayOf = (now: number) => new Date(now).toISOString().slice(0, 10)
const secondsToReset = (now: number) => Math.ceil((Math.floor(now / DAY) * DAY + DAY - now) / 1000)

/**
 * amount 만큼 쓴다. 넘으면 쓰지 않고 ok:false. (KV 는 원자적이지 않아 아주 조금 넘을 수 있다)
 * ip 를 주면 그 사람 하루 상한도 함께 본다. IP 는 그대로 두지 않고 해시 앞 16자만 키에 쓴다.
 */
export async function takeQuota(kv: KV, route: QuotaRoute | string, limit: number, now: number, amount = 1, ip?: string) {
  const day = dayOf(now)
  const resetSec = secondsToReset(now)
  const key = `quota:${route}:${day}`
  const used = Number((await kv.get(key)) ?? 0)
  const ipLimit = IP_LIMITS[route] ?? Math.ceil(limit / 3)
  const ipKey = ip ? `quota:ip:${route}:${(await sha(`${ip}|${day}`)).slice(0, 16)}:${day}` : null
  const ipUsed = ipKey ? Number((await kv.get(ipKey)) ?? 0) : 0
  if (used + amount > limit || ipUsed + amount > ipLimit)
    return { ok: false, remaining: Math.max(0, Math.min(limit - used, ipKey ? ipLimit - ipUsed : Infinity)), resetSec }
  await kv.put(key, String(used + amount), { expirationTtl: 2 * 86_400 })
  if (ipKey) await kv.put(ipKey, String(ipUsed + amount), { expirationTtl: 2 * 86_400 })
  return { ok: true, remaining: limit - used - amount, resetSec }
}

export const quotaHeaders = (q: { remaining: number; resetSec: number }) => ({
  'x-quota-remaining': String(q.remaining),
  'x-quota-reset': String(q.resetSec),
})
