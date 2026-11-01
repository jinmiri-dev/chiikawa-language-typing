/** Worker 설정. 키는 모두 비밀값(wrangler secret put)으로만 넣는다. */

/** Workers KV 에서 쓰는 것만 */
export interface KV {
  get(key: string, type?: 'text'): Promise<string | null>
  get(key: string, type: 'json'): Promise<unknown>
  get(key: string, type: 'arrayBuffer'): Promise<ArrayBuffer | null>
  put(key: string, value: string | ArrayBuffer, opts?: { expirationTtl?: number }): Promise<void>
}

export interface Env {
  KV: KV
  YOUTUBE_API_KEY?: string
  TRANSCRIPT_API_KEY?: string
  AZURE_SPEECH_KEY?: string
  AZURE_SPEECH_REGION?: string
  AZURE_TRANSLATOR_KEY?: string
  AZURE_TRANSLATOR_REGION?: string
  TMDB_TOKEN?: string
  /** 쉼표로 나눈 허용 출처 */
  ALLOWED_ORIGINS: string
}

/** 바깥과 닿는 것(테스트에서 바꿔 끼운다) */
export interface Deps {
  fetch: typeof fetch
  now: () => number
}

export const LANGS = ['en', 'ja', 'zh', 'tw', 'mn'] as const
export type Lang = (typeof LANGS)[number]
export const isLang = (s: string | null): s is Lang => LANGS.includes(s as Lang)
