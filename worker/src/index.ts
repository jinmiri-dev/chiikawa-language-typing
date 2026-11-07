/** 언어 1급 중계 함수 (Cloudflare Worker). 경로와 오류는 docs/아키텍처-API-ERD.md 3장. */
import { isLang, LANGS, type Deps, type Env, type Lang } from './env'
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
  '/news': async () => (await import('./news')).news,
  '/reading': async () => (await import('./reading')).reading,
}

/** 모든 응답에 붙이는 보안 헤더(내용 추측 금지, 출처 안 보냄, 다른 사이트에 끼워 넣기 금지) */
function secure(res: Response): Response {
  const out = new Response(res.body, res)
  out.headers.set('x-content-type-options', 'nosniff')
  out.headers.set('referrer-policy', 'no-referrer')
  out.headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'none'")
  return out
}

/** 브라우저 audio 요소는 출처(Origin)를 보내지 않으므로 목소리만 예외 */
const NO_ORIGIN_OK = new Set(['/health', '/tts'])

export async function handle(req: Request, env: Env, deps: Deps): Promise<Response> {
  const origin = req.headers.get('origin')
  const allowed = env.ALLOWED_ORIGINS.split(',').map((s) => s.trim())
  const url = new URL(req.url)
  const respond = (res: Response) => secure(withCors(res, origin, allowed))

  if (req.method === 'OPTIONS') {
    const res = new Response(null, { status: 204, headers: { 'access-control-allow-methods': 'GET', 'access-control-max-age': '86400' } })
    return respond(res)
  }
  try {
    // 낱말 짝은 줄 목록을 몸으로 받는다(text/plain 이라 미리 묻는 요청이 없다)
    if (req.method === 'POST' && url.pathname === '/gloss') {
      if (!origin || !allowed.includes(origin)) throw new ApiError('FORBIDDEN', '이 사이트에서만 쓸 수 있어요.')
      const lang = url.searchParams.get('lang')
      if (!isLang(lang)) throw new ApiError('BAD_REQUEST', '언어(lang)가 잘못됐어요.')
      const body = await req.text()
      if (body.length > 8000) throw new ApiError('BAD_REQUEST', '줄이 너무 길어요.')
      return respond(await (await import('./gloss')).gloss(body, lang, env, deps))
    }
    if (req.method !== 'GET') return respond(json({ error: { code: 'BAD_REQUEST', message: 'GET 만 받아요.' } }, { status: 405 }))
    if (url.pathname === '/health') return respond(json({ ok: true, version: VERSION }))
    const route = ROUTES[url.pathname]
    if (!route) throw new ApiError('NOT_FOUND', '없는 주소예요.')
    // 브라우저에서 부를 때는 허용 출처만(키를 쓰는 경로를 남이 쓰지 못하게)
    if (origin ? !allowed.includes(origin) : !NO_ORIGIN_OK.has(url.pathname)) throw new ApiError('FORBIDDEN', '이 사이트에서만 쓸 수 있어요.')
    const lang = url.searchParams.get('lang')
    if (!isLang(lang)) throw new ApiError('BAD_REQUEST', '언어(lang)가 잘못됐어요.')
    return respond(await (await route())(url, lang, env, deps))
  } catch (e) {
    if (e instanceof ApiError) return respond(errorResponse(e))
    return respond(errorResponse(new ApiError('UPSTREAM_FAILED', '잠시 문제가 생겼어요. 다시 해 보세요.')))
  }
}

export default {
  fetch: (req: Request, env: Env) =>
    handle(req, env, { fetch: (...a) => fetch(...a), now: () => Date.now(), ip: req.headers.get('cf-connecting-ip') ?? undefined }),
  /** 매일 아침·저녁 예약 실행: 언어별 오늘의 뉴스를 미리 만들어 둔다(사람이 할 일 없음) */
  scheduled: (_event: unknown, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) => {
    const deps: Deps = { fetch: (...a) => fetch(...a), now: () => Date.now() }
    ctx.waitUntil(
      (async () => {
        const { refreshNews } = await import('./news')
        for (const lang of LANGS) await refreshNews(env, deps, lang).catch((e) => console.warn('news', lang, String(e)))
      })(),
    )
  },
}
