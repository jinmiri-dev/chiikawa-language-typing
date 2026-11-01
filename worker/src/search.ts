import type { Deps, Env, Lang } from './env'

/** 다음 Task 에서 채운다 */
export async function search(_url: URL, _lang: Lang, _env: Env, _deps: Deps): Promise<Response> {
  throw new Error('아직')
}
