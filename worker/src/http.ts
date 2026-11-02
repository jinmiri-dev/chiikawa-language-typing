/** 응답 모양과 오류 (아키텍처-API-ERD 3.1) */

export type ErrorCode = 'BAD_REQUEST' | 'NOT_FOUND' | 'NO_TRACK' | 'EMBED_BLOCKED' | 'QUOTA_EXCEEDED' | 'UPSTREAM_FAILED' | 'FORBIDDEN' | 'NOT_CONFIGURED'

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NO_TRACK: 404,
  EMBED_BLOCKED: 409,
  QUOTA_EXCEEDED: 429,
  UPSTREAM_FAILED: 502,
  NOT_CONFIGURED: 503,
}

/** 라우트 처리 중 던지면 오류 응답이 된다 */
export class ApiError extends Error {
  code: ErrorCode
  retryAfter?: number
  constructor(code: ErrorCode, message: string, retryAfter?: number) {
    super(message)
    this.code = code
    this.retryAfter = retryAfter
  }
}

export function json(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json; charset=utf-8', ...init.headers },
  })
}

export function errorResponse(e: ApiError): Response {
  const body = { error: { code: e.code, message: e.message, ...(e.retryAfter !== undefined ? { retryAfter: e.retryAfter } : {}) } }
  return json(body, { status: STATUS[e.code], headers: e.retryAfter !== undefined ? { 'retry-after': String(e.retryAfter) } : {} })
}

/** 허용 출처면 CORS 헤더를 붙인다 */
export function withCors(res: Response, origin: string | null, allowed: string[]): Response {
  if (!origin || !allowed.includes(origin)) return res
  const out = new Response(res.body, res)
  out.headers.set('access-control-allow-origin', origin)
  out.headers.set('access-control-expose-headers', 'x-quota-remaining, x-quota-reset, retry-after')
  out.headers.set('vary', 'origin')
  return out
}

/** 외부 서비스 응답이 실패면 502 로 */
export async function upstreamJson<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    // 키가 틀렸는지(401) 바깥 서비스 문제인지 wrangler tail 로 볼 수 있게 남긴다
    console.warn(`${what} upstream ${res.status}`)
    throw new ApiError('UPSTREAM_FAILED', `${what} 서비스가 응답하지 않았어요. 잠시 뒤 다시 해 보세요.`)
  }
  return (await res.json()) as T
}
