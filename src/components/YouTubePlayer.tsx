import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { command, embedUrl, PLAYER_ORIGIN, segmentDone } from './youtubeEmbed'

export interface PlayerHandle {
  /** 줄 구간만 재생하고 끝에서 멈춘다 */
  playSegment(start: number, end: number, rate: 1 | 0.75): void
}

/** 영상 (기획안 10장): 지금 줄 구간만 재생. 휴대폰에서는 작게. */
export default function YouTubePlayer({ videoId, title, ref }: { videoId: string; title: string; ref?: Ref<PlayerHandle> }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const endAt = useRef<number | null>(null)
  const send = (msg: string) => frame.current?.contentWindow?.postMessage(msg, PLAYER_ORIGIN)

  useImperativeHandle(ref, () => ({
    playSegment(start, end, rate) {
      endAt.current = end
      send(command('seekTo', [start, true]))
      send(command('setPlaybackRate', [rate]))
      send(command('playVideo'))
    },
  }))

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== PLAYER_ORIGIN || typeof e.data !== 'string') return
      let data: { event?: string; info?: { currentTime?: number } }
      try {
        data = JSON.parse(e.data)
      } catch {
        return
      }
      const t = data.info?.currentTime
      if (endAt.current !== null && typeof t === 'number' && segmentDone(t, endAt.current)) {
        endAt.current = null
        send(command('pauseVideo'))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <div className="yt-player">
      <iframe
        ref={frame}
        src={embedUrl(videoId, location.origin)}
        title={`유튜브 영상: ${title}`}
        allow="autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        // 플레이어가 현재 시각을 알려 주게 한다
        onLoad={() => send(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }))}
      />
    </div>
  )
}
