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
  /** 자막 서비스 두 번째(Supadata, 무료 월 100회). 첫째가 멈췄을 때만 쓴다 */
  SUPADATA_API_KEY?: string
  AZURE_SPEECH_KEY?: string
  AZURE_SPEECH_REGION?: string
  AZURE_TRANSLATOR_KEY?: string
  AZURE_TRANSLATOR_REGION?: string
  TMDB_TOKEN?: string
  /** Workers AI(무료 번역). wrangler.toml 의 [ai] binding */
  AI?: { run(model: string, input: unknown): Promise<unknown> }
  /** 쉼표로 나눈 허용 출처 */
  ALLOWED_ORIGINS: string
}

/** 바깥과 닿는 것(테스트에서 바꿔 끼운다) */
export interface Deps {
  fetch: typeof fetch
  now: () => number
  /** 부른 사람 IP(Cloudflare 가 알려 준다). 한 사람 하루 상한에 쓴다 */
  ip?: string
}

export const LANGS = ['en', 'ja', 'zh', 'tw', 'mn'] as const
export type Lang = (typeof LANGS)[number]
export const isLang = (s: string | null): s is Lang => LANGS.includes(s as Lang)
