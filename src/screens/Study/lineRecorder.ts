/** 줄 하나의 기록: 처음 친 글자 정확도, 틀린 횟수, 걸린 시간 (기획안 11.1). */
import { significantChars } from '../../engine/judge/judge'
import type { LineResult } from '../../engine/types'

export function lineRecorder(expected: string, strict: boolean, skip?: RegExp) {
  const exp = significantChars(expected, strict, skip)
  /** 글자 자리마다 처음 확정했을 때 맞았는가 */
  const firstTry: (boolean | undefined)[] = []
  const wrongSeen = new Set<number>()
  let mistakes = 0
  let startAt: number | null = null

  return {
    onCommit(committed: string, now: number) {
      startAt ??= now
      const got = significantChars(committed, strict, skip)
      got.forEach((ch, i) => {
        const ok = ch === exp[i]
        firstTry[i] ??= ok
        if (!ok && !wrongSeen.has(i)) {
          wrongSeen.add(i)
          mistakes++
        }
      })
    },
    result(lineId: string, now: number): LineResult {
      const right = exp.filter((_, i) => firstTry[i] === true).length
      return { lineId, firstTryAccuracy: exp.length ? right / exp.length : 1, ms: startAt === null ? 0 : now - startAt, mistakes, at: now }
    },
    get mistakes() {
      return mistakes
    },
  }
}
