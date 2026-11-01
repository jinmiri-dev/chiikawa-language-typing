import { expect, test } from 'vitest'
import { command, embedUrl, PLAYER_ORIGIN, segmentDone } from './youtubeEmbed'

test('임베드 주소: 개인정보 보호 모드, JS 조종, 휴대폰 안에서 재생', () => {
  const u = new URL(embedUrl('vvvvvvvvvvv', 'https://jinmiri-dev.github.io'))
  expect(u.origin).toBe(PLAYER_ORIGIN)
  expect(u.pathname).toBe('/embed/vvvvvvvvvvv')
  expect(Object.fromEntries(u.searchParams)).toMatchObject({ enablejsapi: '1', playsinline: '1', rel: '0', origin: 'https://jinmiri-dev.github.io' })
})

test('명령 메시지 모양', () => {
  expect(JSON.parse(command('seekTo', [12.5, true]))).toEqual({ event: 'command', func: 'seekTo', args: [12.5, true] })
  expect(JSON.parse(command('pauseVideo'))).toEqual({ event: 'command', func: 'pauseVideo', args: [] })
})

test('구간 끝(조금 일찍)에서 멈춘다', () => {
  expect(segmentDone(9.85, 10)).toBe(true)
  expect(segmentDone(9.5, 10)).toBe(false)
  expect(segmentDone(12, 10)).toBe(true)
})
