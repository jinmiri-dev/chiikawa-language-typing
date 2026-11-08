// @vitest-environment node
import { expect, test } from "vitest"

test('원문에 없는 영문 낱말이 뜻에 생기면 지어낸 번역으로 본다', async () => {
  const { inventedLatin } = await import('./ai')
  expect(inventedLatin('Түүний машинаас зэвсэг олджээ.', 'Cisco는 그의 기계에서 무기를 발견했다.', 'ko')).toBe(true)
  expect(inventedLatin('JR東海によりますと', 'JR 도카이에 따르면', 'ko')).toBe(false)
  expect(inventedLatin('Apple社の新製品', 'Apple의 신제품', 'ko')).toBe(false)
  expect(inventedLatin('사과', 'apple', 'en')).toBe(false)
})
