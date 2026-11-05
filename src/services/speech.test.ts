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

test('중계 함수 목소리가 있으면 그것을 먼저', async () => {
  vi.stubEnv('VITE_WORKER_ORIGIN', 'https://w.test')
  const played: string[] = []
  vi.stubGlobal('Audio', class {
    src: string
    onended: (() => void) | null = null
    constructor(src: string) { this.src = src }
    play() { played.push(this.src); setTimeout(() => this.onended?.(), 0); return Promise.resolve() }
  })
  expect(await speak('はい', { lang: 'ja', voice: 'male', rate: 1 })).toEqual({ source: 'worker' })
  expect(played[0]).toBe('https://w.test/tts?lang=ja&voice=male&text=%E3%81%AF%E3%81%84')
  expect(spoken).toHaveLength(0)
  vi.unstubAllEnvs()
})

test('중계 함수 목소리가 실패하면 기기 목소리', async () => {
  vi.stubEnv('VITE_WORKER_ORIGIN', 'https://w.test')
  vi.stubGlobal('Audio', class {
    play() { return Promise.reject(new Error('blocked')) }
  })
  expect(await speak('はい', { lang: 'ja', voice: 'female', rate: 1 })).toEqual({ source: 'device' })
  expect(spoken[0].voice?.name).toContain('Nanami')
  vi.unstubAllEnvs()
})

test('목소리 목록이 처음에 비어 있어도(크롬) 목록이 차면 읽는다', async () => {
  let voices: FakeVoice[] = []
  const listeners: (() => void)[] = []
  install([])
  vi.stubGlobal('speechSynthesis', {
    getVoices: () => voices,
    cancel: () => {},
    addEventListener: (_: string, f: () => void) => listeners.push(f),
    removeEventListener: () => {},
    speak: (u: { text: string; voice: FakeVoice | null; rate: number; lang: string; onend?: () => void }) => {
      spoken.push({ text: u.text, voice: u.voice, rate: u.rate, lang: u.lang })
      u.onend?.()
    },
  })
  setTimeout(() => {
    voices = [{ name: 'Google US English', lang: 'en-US' }]
    listeners.forEach((f) => f())
  }, 50)
  expect(await speak('Morning', { lang: 'en', voice: 'female', rate: 1 })).toEqual({ source: 'device' })
  expect(spoken[0].text).toBe('Morning')
})
