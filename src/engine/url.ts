/** 바깥에서 온 주소(뉴스 RSS·백업 파일 등)는 http·https 만 링크로 쓴다(javascript: 같은 주소로 스크립트가 돌지 않게) */
export function safeLink(u: unknown): string | undefined {
  if (typeof u !== 'string' || u.length > 2000) return undefined
  try {
    const url = new URL(u)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined
  } catch {
    return undefined
  }
}
