import { afterEach, expect, test, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

test('기기 번역으로 빠진 줄만 채운다(이미 있는 뜻은 그대로)', async () => {
  vi.stubGlobal('Translator', {
    availability: async () => 'available',
    create: async (o: { sourceLanguage: string; targetLanguage: string }) => ({ translate: async (t: string) => `${o.targetLanguage}:${t}` }),
  })
  const { fillLines } = await import('./translate')
  const lines = [{ src: 'a', ko: '있음' }, { src: 'b' }, { src: 'c' }] as { src: string; ko?: string }[]
  const n = await fillLines(lines, (l) => !!l.ko, (l) => l.src, (i, ko) => (lines[i] = { ...lines[i], ko }), 'en', 'ko')
  expect(n).toBe(2)
  expect(lines.map((l) => l.ko)).toEqual(['있음', 'ko:b', 'ko:c'])
})

test('기기 번역이 없는 브라우저면 아무것도 바꾸지 않는다', async () => {
  vi.resetModules()
  const { fillLines } = await import('./translate')
  const lines = [{ src: 'a' }] as { src: string; ko?: string }[]
  expect(await fillLines(lines, (l) => !!l.ko, (l) => l.src, () => undefined, 'mn', 'ko')).toBe(0)
})
