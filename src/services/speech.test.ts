import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { canSpeak, speak } from './speech'

type FakeVoice = { name: string; lang: string }
let spoken: { text: string; voice: FakeVoice | null; rate: number; lang: string }[] = []

function install(voices: FakeVoice[]) {
  spoken = []
  class Utterance {
    voice: FakeVoice | null = null
    rate = 1
    lang = ''
    onend: (() => void) | null = null
    text: string
    constructor(text: string) {
      this.text = text
    }
  }
  vi.stubGlobal('SpeechSynthesisUtterance', Utterance)
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    cancel: () => {},
    speak: (u: Utterance) => {
      spoken.push({ text: u.text, voice: u.voice, rate: u.rate, lang: u.lang })
      u.onend?.()
    },
  })
}

beforeEach(() => install([
  { name: 'Microsoft Nanami Online', lang: 'ja-JP' },
  { name: 'Microsoft Keita Online', lang: 'ja-JP' },
  { name: 'Google US English', lang: 'en-US' },
]))
afterEach(() => vi.unstubAllGlobals())

test('여자 목소리', async () => {
  expect(await speak('食べる', { lang: 'ja', voice: 'female', rate: 1 })).toEqual({ source: 'device' })
  expect(spoken[0].voice?.name).toContain('Nanami')
  expect(spoken[0].lang).toBe('ja-JP')
})

test('남자 목소리와 느리게', async () => {
  await speak('食べる', { lang: 'ja', voice: 'male', rate: 0.75 })
  expect(spoken[0].voice?.name).toContain('Keita')
  expect(spoken[0].rate).toBe(0.75)
})

test('남자 목소리가 없으면 그 언어 첫 목소리', async () => {
  install([{ name: 'Kyoko', lang: 'ja-JP' }])
  await speak('はい', { lang: 'ja', voice: 'male', rate: 1 })
  expect(spoken[0].voice?.name).toBe('Kyoko')
})

test('그 언어 목소리가 없으면 말하지 않는다', async () => {
  install([{ name: 'Google US English', lang: 'en-US' }])
  expect(await speak('はい', { lang: 'ja', voice: 'female', rate: 1 })).toEqual({ source: 'none' })
  expect(spoken).toHaveLength(0)
  expect(await canSpeak('ja')).toBe(false)
  expect(await canSpeak('en')).toBe(true)
})
