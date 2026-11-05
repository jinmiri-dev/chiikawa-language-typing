/** 언어 1급 중계 함수 (Cloudflare Worker). 경로와 오류는 docs/아키텍처-API-ERD.md 3장. */
import { isLang, type Deps, type Env, type Lang } from './env'
import { ApiError, errorResponse, json, withCors } from './http'

export const VERSION = '1.0.0'

type Handler = (url: URL, lang: Lang, env: Env, deps: Deps) => Promise<Response>

/** 언어를 받는 경로들. 각 모듈이 채운다 */
const ROUTES: Record<string, () => Promise<Handler>> = {
  '/search': async () => (await import('./search')).search,
  '/transcript': async () => (await import('./transcript')).transcript,
  '/tts': async () => (await import('./tts')).tts,
  '/netflix': async () => (await import('./netflix')).netflix,
  '/lyrics': async () => (await import('./lyrics')).lyrics,
}

export async function handle(req: Request, env: Env, deps: Deps): Promise<Response> {
  const origin = req.headers.get('origin')
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  const url = new URL(req.url)
  const respond = (res: Response) => withCors(res, origin, allowed)

  if (req.method === 'OPTIONS') {
    const res = new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } })
    return respond(res)
  }
  try {
    if (req.method !== 'GET') return respond(json({ error: { code: 'BAD_REQUEST', message: 'GET 만 받아요.' } }, { status: 405 }))
    if (url.pathname === '/health') return respond(json({ ok: true, version: VERSION }))
    const route = ROUTES[url.pathname]
    if (!route) throw new ApiError('NOT_FOUND', '없는 주소예요.')
    // 브라우저에서 부를 때는 허용 출처만(키를 쓰는 경로를 남이 쓰지 못하게)
    if (origin && !allowed.includes(origin)) throw new ApiError('FORBIDDEN', '이 사이트에서만 쓸 수 있어요.')
    const lang = url.searchParams.get('lang')
    if (!isLang(lang)) throw new ApiError('BAD_REQUEST', '언어(lang)가 잘못됐어요.')
    return respond(await (await route())(url, lang, env, deps))
  } catch (e) {
    if (e instanceof ApiError) return respond(errorResponse(e))
    return respond(errorResponse(new ApiError('UPSTREAM_FAILED', '잠시 문제가 생겼어요. 다시 해 보세요.')))
  }
}

export default {
  fetch: (req: Request, env: Env) => handle(req, env, { fetch: (...a) => fetch(...a), now: () => Date.now() }),
}
