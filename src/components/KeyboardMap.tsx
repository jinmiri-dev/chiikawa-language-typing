import type { Gesture, KeyStep, Layout } from '../engine/layouts'
import './KeyboardMap.css'

const ARROW: Record<Gesture, string> = { tap: '', left: '←', up: '↑', right: '→', down: '↓' }
const PUNCT: Record<string, string> = { minus: '-', equal: '=', comma: ',', period: '.', slash: '/', semicolon: ';', quote: "'", bracketleft: '[', bracketright: ']', backquote: '`' }
/** PC 자판에서 키 글자가 영문과 다르면(몽골어 키릴·주음) 실제 영문 자리를 작게 함께 적는다 */
function latinOf(id: string, label: string, pc: boolean): string | null {
  if (!pc) return null
  const latin = /^[a-z0-9]$/.test(id) ? id.toUpperCase() : (PUNCT[id] ?? null)
  if (!latin || label.toUpperCase() === latin || label === latin) return null
  return latin
}

/** 배열 그림. 다음 키 하나만 노란색으로 강조하고, 플릭이면 밀 방향 화살표를 띄운다. 화면 읽기는 따로 문장으로 알린다. */
/** then: Shift 다음에 누를 키(Shift 와 함께 밝혀 '어느 글자를 Shift 로'인지 한눈에) */
export default function KeyboardMap({ layout, next, then, small = false }: { layout: Layout; next?: KeyStep; then?: KeyStep; small?: boolean }) {
  const shiftHeld = next?.keyId === 'shift'
  return (
    <div className={`kbd-map kbd-${layout.device}${small ? ' kbd-small' : ''}`} aria-hidden="true">
      {layout.rows.map((row, r) => (
        <div className="kbd-row" key={r}>
          {row.map((k) => {
            const now = next?.keyId === k.id || (shiftHeld && (k.id === 'shiftRight' || then?.keyId === k.id))
            const arrow = now && next?.gesture ? ARROW[next.gesture] : ''
            return (
              <span key={k.id} className="kbd-key" data-now={now || undefined} style={{ flexGrow: k.w ?? 1 }}>
                {k.label}
                {(() => {
                  const latin = latinOf(k.id, k.label, layout.device === 'pc')
                  return latin ? <small className="kbd-latin">{latin}</small> : null
                })()}
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
