/** 테스트용: 메모리 KV 와 가짜 외부 응답 */
import type { Env, KV } from './env'

export function memoryKV(): KV & { data: Map<string, string | ArrayBuffer> } {
  const data = new Map<string, string | ArrayBuffer>()
  return {
    data,
    async get(key: string, type?: 'text' | 'json' | 'arrayBuffer') {
      const v = data.get(key)
      if (v === undefined) return null
      if (type === 'json') return JSON.parse(v as string)
      return v
    },
    async put(key: string, value: string | ArrayBuffer) {
      data.set(key, value)
    },
  } as KV & { data: Map<string, string | ArrayBuffer> }
}

export function testEnv(over: Partial<Env> = {}): Env {
  return {
    KV: memoryKV(),
    YOUTUBE_API_KEY: 'yt',
    TRANSCRIPT_API_KEY: 'tr',
    AZURE_SPEECH_KEY: 'sp',
    AZURE_SPEECH_REGION: 'koreacentral',
    AZURE_TRANSLATOR_KEY: 'tl',
    AZURE_TRANSLATOR_REGION: 'koreacentral',
    TMDB_TOKEN: 'tm',
    ALLOWED_ORIGINS: 'https://jinmiri-dev.github.io,http://localhost:5173',
    ...over,
  }
}

/** 주소에 들어간 글자로 가짜 응답을 고른다. 부른 주소는 calls 에 남는다 */
export function fakeFetch(routes: [string | RegExp, () => Response | Promise<Response>][]) {
  const calls: string[] = []
  const fn = (async (input: RequestInfo | URL) => {
    const url = String(input instanceof Request ? input.url : input)
    calls.push(url)
    const hit = routes.find(([m]) => (typeof m === 'string' ? url.includes(m) : m.test(url)))
    if (!hit) return new Response('not mocked: ' + url, { status: 599 })
    return hit[1]()
  }) as typeof fetch
  return Object.assign(fn, { calls })
}

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
