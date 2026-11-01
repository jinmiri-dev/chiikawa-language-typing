/** 실제 연습 시간 (기획안 14장). 탭을 숨겼거나 60초 동안 입력이 없으면 멈춘다. */

export interface ClockState {
  activeMs: number
  /** 마지막으로 활동이 있었던 때. 숨겼으면 null */
  lastAt: number | null
}

const IDLE_LIMIT = 60_000
const STAGE_MS = 300_000
const LAST_STAGE = 12

/** 입력 사이 간격(60초 이하)만 더한다. 입력이 없으면 시간이 흐르지 않는다. */
export function clockEvent(s: ClockState, now: number, kind: 'input' | 'hide' | 'show'): ClockState {
  if (kind === 'show') return { ...s, lastAt: null }
  const gap = s.lastAt === null ? 0 : now - s.lastAt
  const activeMs = s.activeMs + (gap > 0 && gap <= IDLE_LIMIT ? gap : 0)
  if (kind === 'hide') return { activeMs, lastAt: null }
  return { activeMs, lastAt: now }
}

/** 0~12: 5분마다 한 단계, 60분 넘으면 12 */
export function stageOf(activeMs: number): number {
  return Math.min(LAST_STAGE, Math.floor(activeMs / STAGE_MS))
}
