/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FRIEND_INFO, STAGE_LINES, type FriendLine } from '../content/friendLines'
import { splitSentences } from '../engine/text'
import type { FriendId } from '../engine/types'
import './components.css'

const BASE = import.meta.env.BASE_URL

/** 여러 문장인 글: 문장마다 한 덩어리로 묶어 문장 가운데서 줄이 바뀌지 않게 한다 */
export function Sentences({ text }: { text: string }) {
  const parts = splitSentences(text)
  if (parts.length < 2) return <>{text}</>
  return (
    <>
      {parts.map((s, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="sent">{s}</span>
        </span>
      ))}
    </>
  )
}

/** 머리글. 왼쪽은 로고(또는 뒤로), 오른쪽은 이용 안내·설정. */
export function AppHeader({ back, title, right }: { back?: string; title?: ReactNode; right?: ReactNode }) {
  return (
    <header className="app-header">
      <div className="app-header-left">
        {back && (
          <a className="icon-btn back" href={back} aria-label="뒤로">
            ←
          </a>
        )}
        <a className="logo" href="#/">
          언어 1급
        </a>
        {title ?? <span className="logo-sub">외국어 타자 연습</span>}
      </div>
      <nav className="app-header-nav">
        {right ?? (
          <>
            <a href="#/guide">이용 안내</a>
            <a href="#/settings">설정</a>
          </>
        )}
      </nav>
    </header>
  )
}

const FRIEND_ORDER = Object.keys(FRIEND_INFO)
/** 한 번 못 받은 그림 주소. 다시 요청하지 않는다(그림을 아직 올리지 않은 배포에서 404 가 쌓이지 않게) */
const missing = new Set<string>()

/**
 * 포즈 그림. 그림 파일이 없으면(사용권 확인 전 배포) 이름 배지로 대신한다.
 * 늘 천천히 숨 쉬고, 말하거나(cue 가 바뀜) 자세가 바뀌면 한 번 통 튄다. 처음 그릴 때는 튀지 않는다.
 */
export function FriendImage({ friend, stage = 0, size = 120, cue = 0 }: { friend: FriendId; stage?: number; size?: number; cue?: number }) {
  const src = `${BASE}friends/${friend}-${String(stage).padStart(2, '0')}.webp`
  const [, setFailed] = useState(0)
  const broken = missing.has(src)
  const moveKey = `${stage}:${cue}`
  const [firstKey] = useState(moveKey)
  const name = FRIEND_INFO[friend].name
  const label = stage === 0 ? '시작' : `${stage * 5}분`
  const alt = `${name} ${label} 자세: ${STAGE_LINES[friend][stage].pose}`
  // 여러 친구가 한 화면에 있어도 같은 박자로 움직이지 않게 친구마다 박자를 어긋낸다
  const delay = `${-FRIEND_ORDER.indexOf(friend) * 1.3}s`
  return (
    <span className="friend friend-alive" style={{ animationDelay: delay }}>
      <span key={moveKey} className={moveKey === firstKey ? 'friend-move' : 'friend-move friend-hop'}>
        {broken ? (
          <span className="friend-badge" role="img" aria-label={alt} style={{ width: size, height: size, fontSize: size / 3 }}>
            {name[0]}
          </span>
        ) : (
          <img
            className="friend-img"
            src={src}
            alt={alt}
            width={size}
            height={size}
            onError={() => {
              missing.add(src)
              setFailed((n) => n + 1)
            }}
          />
        )}
      </span>
    </span>
  )
}

/** 말풍선. 4초 보이고 사라진다. 화면 읽기에도 읽힌다. */
export function FriendBubble({ line, shownAt }: { line: FriendLine | null; shownAt: number }) {
  const [hiddenAt, setHiddenAt] = useState<number | null>(null)
  useEffect(() => {
    if (!line) return
    const t = setTimeout(() => setHiddenAt(shownAt), 4000)
    return () => clearTimeout(t)
  }, [line, shownAt])
  const visible = !!line && hiddenAt !== shownAt
  return (
    <p className="bubble" aria-live="polite" data-visible={visible && !!line}>
      {line && visible ? (
        <>
          <b>
            <Sentences text={line.text} />
          </b>
          {line.action && <span className="bubble-action">{line.action}</span>}
        </>
      ) : null}
    </p>
  )
}

/** 상태 안내 (와이어프레임 10) */
export function StatusNotice({ title, children, tone = 'info' }: { title: string; children?: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <div className={`notice notice-${tone}`} role="status">
      <b>
        <Sentences text={title} />
      </b>
      {children && <div className="notice-body">{typeof children === 'string' ? <Sentences text={children} /> : children}</div>}
    </div>
  )
}

/** 바텀시트. 열 때 history 한 칸을 쌓아 휴대폰 뒤로 가기가 시트만 닫게 한다. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    history.pushState({ sheet: true }, '')
    const onPop = () => onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && history.back()
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="sheet-backdrop" onClick={() => history.back()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={() => history.back()}>
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
