import type { Gesture, KeyStep, Layout } from '../engine/layouts'
import './KeyboardMap.css'

const ARROW: Record<Gesture, string> = { tap: '', left: '←', up: '↑', right: '→', down: '↓' }

/** 배열 그림. 다음 키 하나만 노란색으로 강조하고, 플릭이면 밀 방향 화살표를 띄운다. 화면 읽기는 따로 문장으로 알린다. */
export default function KeyboardMap({ layout, next, small = false }: { layout: Layout; next?: KeyStep; small?: boolean }) {
  const shiftHeld = next?.keyId === 'shift'
  return (
    <div className={`kbd-map kbd-${layout.device}${small ? ' kbd-small' : ''}`} aria-hidden="true">
      {layout.rows.map((row, r) => (
        <div className="kbd-row" key={r}>
          {row.map((k) => {
            const now = next?.keyId === k.id || (shiftHeld && k.id === 'shiftRight')
            const arrow = now && next?.gesture ? ARROW[next.gesture] : ''
            return (
              <span key={k.id} className="kbd-key" data-now={now || undefined} style={{ flexGrow: k.w ?? 1 }}>
                {k.label}
                {arrow && <span className="kbd-arrow">{arrow}</span>}
                {now && next?.taps && next.taps > 1 && <span className="kbd-taps">×{next.taps}</span>}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}
