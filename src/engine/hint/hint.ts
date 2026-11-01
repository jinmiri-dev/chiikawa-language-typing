/** 안내 줄이기 (기획안 11.3): 같은 글자를 3번 연속 맞히면 한 단계 줄이고, 틀리거나 2초 멈추면 다시 전체 안내. */

export type HintLevel = 'full' | 'line' | 'off'
export type HintMemory = Record<string, { streak: number; level: HintLevel }>

const STEP = 3
const IDLE_MS = 2000
const NEXT: Record<HintLevel, HintLevel> = { full: 'line', line: 'off', off: 'off' }

export function nextHintLevel(
  mem: HintMemory,
  unitKey: string,
  correct: boolean,
  idleMs: number,
): { mem: HintMemory; level: HintLevel } {
  const cur = mem[unitKey] ?? { streak: 0, level: 'full' as HintLevel }
  let next: { streak: number; level: HintLevel }
  if (!correct || idleMs >= IDLE_MS) next = { streak: 0, level: 'full' }
  else if (cur.streak + 1 >= STEP) next = { streak: 0, level: NEXT[cur.level] }
  else next = { streak: cur.streak + 1, level: cur.level }
  return { mem: { ...mem, [unitKey]: next }, level: next.level }
}
