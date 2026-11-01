import { expect, test } from 'vitest'
import { lineRecorder } from './lineRecorder'

test('틀렸다 고쳐도 처음 친 글자 정확도는 그대로', () => {
  const r = lineRecorder('たべる', false)
  r.onCommit('たへ', 1000)
  r.onCommit('た', 1500)
  r.onCommit('たべる', 3000)
  expect(r.result('greet-01', 3000)).toEqual({ lineId: 'greet-01', firstTryAccuracy: 2 / 3, ms: 2000, mistakes: 1, at: 3000 })
})

test('처음부터 맞으면 1, 틀림 0', () => {
  const r = lineRecorder('うん、元気だよ。', false)
  r.onCommit('うん', 0)
  r.onCommit('うん元気だよ', 4000)
  expect(r.result('greet-02', 4000)).toMatchObject({ firstTryAccuracy: 1, mistakes: 0, ms: 4000 })
})

test('같은 자리에서 또 틀려도 한 번만 센다', () => {
  const r = lineRecorder('たべる', false)
  r.onCommit('たへ', 0)
  r.onCommit('た', 0)
  r.onCommit('ため', 0)
  expect(r.result('x', 0).mistakes).toBe(1)
})
