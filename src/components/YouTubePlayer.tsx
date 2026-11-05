import { useEffect, useImperativeHandle, useRef, type Ref } from 'react'
import { command, embedUrl, PLAYER_ORIGIN, segmentDone } from './youtubeEmbed'

export interface PlayerHandle {
  /** 줄 구간만 재생하고 끝에서 멈춘다. 멈추면(또는 다른 구간을 틀면) 풀린다. */
  playSegment(start: number, end: number, rate: number): Promise<void>
  /** 그 시각부터 멈추지 않고 이어 재생(가사 보기) */
  playFrom(start: number): void
  setRate(rate: number): void
  pause(): void
}

/** 영상 (기획안 10장): 지금 줄 구간만 재생. 휴대폰에서는 작게. */
export default function YouTubePlayer({ videoId, title, ref, onTime }: { videoId: string; title: string; ref?: Ref<PlayerHandle>; onTime?: (t: number) => void }) {
  const onTimeRef = useRef(onTime)
  onTimeRef.current = onTime
  const frame = useRef<HTMLIFrameElement>(null)
  const endAt = useRef<number | null>(null)
  const done = useRef<(() => void) | null>(null)
  const finish = () => {
    done.current?.()
    done.current = null
  }
  const send = (msg: string) => frame.current?.contentWindow?.postMessage(msg, PLAYER_ORIGIN)

  useImperativeHandle(ref, () => ({
    playSegment(start, end, rate) {
      finish()
      endAt.current = end
      send(command('seekTo', [start, true]))
      send(command('setPlaybackRate', [rate]))
      send(command('playVideo'))
      return new Promise<void>((resolve) => {
        done.current = resolve
        // 플레이어가 시각을 못 알려 줘도 멈춰 서지 않게 구간 길이만큼 뒤에 푼다
        setTimeout(() => done.current === resolve && finish(), ((end - start) / rate + 3) * 1000)
      })
    },
    playFrom(start) {
      finish()
      endAt.current = null
      send(command('seekTo', [start, true]))
      send(command('playVideo'))
    },
    setRate(rate) {
      send(command('setPlaybackRate', [rate]))
    },
    pause() {
      finish()
      endAt.current = null
      send(command('pauseVideo'))
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
      if (typeof t === 'number') onTimeRef.current?.(t)
      if (endAt.current !== null && typeof t === 'number' && segmentDone(t, endAt.current)) {
        endAt.current = null
        send(command('pauseVideo'))
        finish()
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
