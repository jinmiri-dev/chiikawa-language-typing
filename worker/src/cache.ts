/** KV 캐시 (아키텍처-API-ERD 5장) */
import type { KV } from './env'

export async function cachedJson<T>(kv: KV, key: string): Promise<T | null> {
  return ((await kv.get(key, 'json')) as T | null) ?? null
}

export async function putJson(kv: KV, key: string, value: unknown, ttlSec?: number): Promise<void> {
  await kv.put(key, JSON.stringify(value), ttlSec ? { expirationTtl: ttlSec } : undefined)
}

/** 캐시 키에 넣을 짧은 해시 */
export async function sha(text: string, algo: 'SHA-1' | 'SHA-256' = 'SHA-256'): Promise<string> {
  const buf = await crypto.subtle.digest(algo, new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
