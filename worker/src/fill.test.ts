// @vitest-environment node
import { expect, test } from 'vitest'
import { fillAllTranscripts } from './transcript'
import { testEnv } from './testing'

test('예약 실행: 뜻이 빠진 영상 자막을 몽골어부터 채운다(영상을 아무도 안 열어도)', async () => {
  const env = testEnv()
  const order: string[] = []
  env.AI = {
    run: async (_m: string, input: { messages?: { content: string }[] }) => {
      const lines = JSON.parse(input.messages![1].content) as string[]
      order.push(lines[0])
      return { response: JSON.stringify(lines.map((_, i) => `뜻${i + 1}`)) }
    },
  } as never
  await env.KV.put('transcript:v6:aaaaaaaaaaa:ja', JSON.stringify({ koSource: 'auto', koV: 3, lines: [{ start: 0, end: 1, src: 'こんにちは', ko: '안녕' }, { start: 1, end: 2, src: '元気' }] }))
  await env.KV.put('transcript:v6:bbbbbbbbbbb:mn', JSON.stringify({ koSource: 'none', koV: 3, lines: [{ start: 0, end: 1, src: 'Сайн уу' }] }))
  await env.KV.put('transcript:v6:ccccccccccc:en', JSON.stringify({ koSource: 'auto', koV: 3, lines: [{ start: 0, end: 1, src: 'Hi', ko: '안녕' }] }))
  const r = await fillAllTranscripts(env, { fetch: (async () => new Response('')) as never, now: () => 1 })
  expect(r).toEqual({ filled: 2, quota: false })
  expect(order).toEqual(['Сайн уу', '元気'])
  const mn = JSON.parse((await env.KV.get('transcript:v6:bbbbbbbbbbb:mn')) as string)
  expect(mn.lines[0].ko).toBe('뜻1')
})
