import { expect, test } from 'vitest'
import { syncStep } from './youtubeSync'

const lines = [
  { start: 0, end: 3 },
  { start: 3, end: 6 },
  { start: 8, end: 11 },
]

test('지금 줄 끝을 지나면 멈춘다(영상과 타자가 함께 간다)', () => {
  expect(syncStep(lines, 0, 2.5, 2.9)).toEqual({ pause: true })
  expect(syncStep(lines, 1, 5.5, 5.95)).toEqual({ pause: true })
})
test('줄 안에서는 그대로', () => expect(syncStep(lines, 0, 1, 1.25)).toEqual({}))
test('멈춘 뒤 사용자가 다시 틀어 끝을 넘어 계속 보면 막지 않는다(이미 지났으니)', () => expect(syncStep(lines, 0, 3.1, 3.35)).toEqual({}))
test('진행 막대를 끌어 다른 줄로 가면 그 줄로 옮긴다', () => {
  expect(syncStep(lines, 0, 1, 9)).toEqual({ goTo: 2 })
  expect(syncStep(lines, 2, 9, 0.5)).toEqual({ goTo: 0 })
})
test('줄 사이 빈 곳으로 끌면 그다음 줄로', () => expect(syncStep(lines, 0, 1, 7)).toEqual({ goTo: 2 }))
test('같은 줄 안에서 끌면 옮기지 않는다', () => expect(syncStep(lines, 2, 8.2, 10.5)).toEqual({}))
