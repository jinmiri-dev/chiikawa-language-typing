/** 유튜브 임베드 조종 (기획안 10장 듣기). IFrame API 스크립트를 싣지 않고 postMessage 로 명령한다(CSP 를 넓히지 않으려고). */

export const PLAYER_ORIGIN = 'https://www.youtube-nocookie.com'

export function embedUrl(videoId: string, origin: string): string {
  const u = new URL(`${PLAYER_ORIGIN}/embed/${videoId}`)
  for (const [k, v] of Object.entries({ enablejsapi: '1', playsinline: '1', rel: '0', modestbranding: '1', origin })) u.searchParams.set(k, v)
  return u.toString()
}

/** 플레이어에 보내는 명령 */
export function command(func: 'playVideo' | 'pauseVideo' | 'seekTo' | 'setPlaybackRate', args: unknown[] = []): string {
  return JSON.stringify({ event: 'command', func, args })
}

/** 구간 끝에 다다랐나(알림 간격 때문에 0.2초 일찍 멈춘다) */
export const segmentDone = (currentTime: number, end: number) => currentTime >= end - 0.2
