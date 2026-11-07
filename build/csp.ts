/**
 * 콘텐츠 보안 정책(CSP). GitHub Pages는 응답 헤더를 바꿀 수 없어서 빌드 때 <meta>로 넣는다.
 * 개발 서버(HMR 인라인 스크립트·웹소켓)에는 넣지 않는다. docs/보안-점검.md 참고.
 */
export function buildCsp(opts: { workerOrigin?: string } = {}): string {
  const connect = ["'self'", opts.workerOrigin].filter(Boolean).join(' ')
  return [
    "default-src 'self'",
    "script-src 'self'",
    // React의 style 속성과 Google Fonts CSS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    "img-src 'self' data: blob: https://i.ytimg.com https://image.tmdb.org",
    // 중계 함수의 목소리(mp3)
    `media-src ${["'self'", 'blob:', opts.workerOrigin].filter(Boolean).join(' ')}`,
    `connect-src ${connect}`,
    'frame-src https://www.youtube-nocookie.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    // 혹시 http 주소가 섞여도 https 로만 부른다
    'upgrade-insecure-requests',
  ].join('; ')
}

export function injectCsp(html: string, opts: { workerOrigin?: string } = {}): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${buildCsp(opts)}" />`
  return html.replace(/<head>/i, `<head>\n    ${meta}`)
}
