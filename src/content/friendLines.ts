/** 친구 말투 (docs/캐릭터-말투.md). 문구는 friendLines.data.ts 에 자동 생성된다. */
import type { FriendId } from '../engine/types'
import { FRIEND_INFO, SITUATION_LINES, STAGE_LINES } from './friendLines.data'

export const SITUATIONS = [
  'hello', 'line', 'streak', 'oops', 'comeback', 'step', 'rest', 'sixty', 'finish', 'review', 'welcome',
] as const
export type Situation = (typeof SITUATIONS)[number]

/** 말풍선 글과, 있으면 함께 보이는 동작 */
export interface FriendLine {
  text: string
  action?: string
}

export const FRIEND_LINES = SITUATION_LINES
export { FRIEND_INFO, STAGE_LINES }

/** 같은 상황에서 직전 문구를 빼고 무작위로 고른다 */
export function pickLine(friend: FriendId, situation: Situation, last?: string, rand: () => number = Math.random): FriendLine {
  const all = FRIEND_LINES[friend][situation]
  const pool = all.length > 1 ? all.filter((l) => l.text !== last) : all
  return pool[Math.floor(rand() * pool.length)]
}
