/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { FRIEND_INFO, STAGE_LINES, type FriendLine } from '../content/friendLines'
import type { FriendId } from '../engine/types'
import './components.css'

const BASE = import.meta.env.BASE_URL

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

/** 포즈 그림. 그림 파일이 없으면(사용권 확인 전 배포) 이름 배지로 대신한다. */
export function FriendImage({ friend, stage = 0, size = 120 }: { friend: FriendId; stage?: number; size?: number }) {
  const [broken, setBroken] = useState(false)
  const name = FRIEND_INFO[friend].name
  const label = stage === 0 ? '시작' : `${stage * 5}분`
  const alt = `${name} ${label} 자세: ${STAGE_LINES[friend][stage].pose}`
  if (broken)
    return (
      <span className="friend-badge" role="img" aria-label={alt} style={{ width: size, height: size, fontSize: size / 3 }}>
        {name[0]}
      </span>
    )
  return (
    <img
      className="friend-img"
      src={`${BASE}friends/${friend}-${String(stage).padStart(2, '0')}.webp`}
      alt={alt}
      width={size}
      height={size}
      onError={() => setBroken(true)}
    />
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
          <b>{line.text}</b>
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
      <b>{title}</b>
      {children && <div className="notice-body">{children}</div>}
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
