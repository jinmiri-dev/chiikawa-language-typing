/** 듣기 (기획안 10장). 중계 함수의 Azure 목소리(여자/남자, 캐시)를 먼저 쓰고, 안 되면 기기 음성(speechSynthesis). */
import { LANG_NAME, type Lang } from '../engine/lang'
import { ttsUrl, workerOrigin } from './api'

type Voice = 'female' | 'male'

/** 이름으로 남녀를 가린다. 기기·브라우저마다 이름이 달라 흔한 것만 둔다. */
const NAME_HINT: Record<Voice, RegExp> = {
  female: /nanami|kyoko|haruka|ayumi|mizuki|aoi|xiaoxiao|xiaoyi|huihui|yaoyao|tingting|meijia|hsiaochen|hsiaoyu|hanhan|zira|aria|jenny|samantha|karen|moira|yesui|female|여자/i,
  male: /keita|otoya|ichiro|daichi|naoki|yunxi|yunyang|kangkang|yunjhe|zhiwei|david|guy|daniel|alex|fred|bataa|male|남자/i,
}

/**
 * 기기 목소리 목록. 크롬은 처음에 빈 목록을 주고 voiceschanged 뒤에 채운다.
 * 비어 있으면 잠깐(최대 1.5초) 기다린다. 그러지 않으면 첫 단어·첫 문장이 소리 없이 지나간다.
 */
function allVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof speechSynthesis === 'undefined') return Promise.resolve([])
  const now = speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer)
      speechSynthesis.removeEventListener?.('voiceschanged', done)
      resolve(speechSynthesis.getVoices())
    }
    const timer = setTimeout(done, 1500)
    speechSynthesis.addEventListener?.('voiceschanged', done)
  })
}

async function voicesFor(lang: Lang | 'ko'): Promise<SpeechSynthesisVoice[]> {
  const prefix = lang === 'ko' ? 'ko' : LANG_NAME[lang].htmlLang.toLowerCase()
  const list = (await allVoices()).filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
  // Edge 의 온라인 자연 음성(…Online (Natural))이 더 또렷하다. 몽골어는 Edge 에만 있는 경우가 많다
  return [...list].sort((a, b) => Number(/Natural|Online/i.test(b.name)) - Number(/Natural|Online/i.test(a.name)))
}

async function pickVoice(lang: Lang, voice: Voice): Promise<SpeechSynthesisVoice | null> {
  const all = await voicesFor(lang)
  // 'female' 이 'male' 을 포함하므로 남자 목소리는 여자 표에 걸리지 않는 것만
  const match = all.find((v) => NAME_HINT[voice].test(v.name) && (voice === 'female' || !NAME_HINT.female.test(v.name)))
  return match ?? all[0] ?? null
}

/**
 * 한국어 읽기(외국인 한국어 배우기): 기기 목소리. 단어를 눌렀을 때, 문장을 천천히 들을 때.
 * 한국어 목소리가 없으면 'none'.
 */
export async function speakKo(text: string, rate = 0.9): Promise<{ source: 'device' | 'none' }> {
  const v = (await voicesFor('ko'))[0]
  if (!v) return Promise.resolve({ source: 'none' })
  stopSpeaking()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = v
    u.lang = v.lang
    u.rate = rate
    u.onend = () => resolve({ source: 'device' })
    u.onerror = () => resolve({ source: 'device' })
    speechSynthesis.speak(u)
  })
}

export async function canSpeak(lang: Lang): Promise<boolean> {
  return (await voicesFor(lang)).length > 0
}

export function stopSpeaking(): void {
  current?.pause?.()
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel()
}

let current: HTMLAudioElement | null = null

/** 중계 함수 목소리. 재생이 끝나면 풀리고, 실패하면 던진다 */
function playWorker(text: string, opts: { lang: Lang; voice: Voice; rate: 1 | 0.75 }): Promise<void> {
  current?.pause?.()
  const audio = new Audio(ttsUrl(opts.lang, opts.voice, text, opts.rate))
  current = audio
  return new Promise((resolve, reject) => {
    audio.onended = () => resolve()
    audio.onerror = () => reject(new Error('목소리를 받지 못했어요'))
    audio.play().catch(reject)
  })
}

/** 중계 목소리가 한 번 안 되면(키 없음 등) 이번 방문 동안은 기기 목소리만 쓴다. 단어마다 읽을 때 기다리지 않게. */
let workerDown = false

export async function speak(text: string, opts: { lang: Lang; voice: Voice; rate: 1 | 0.75 }): Promise<{ source: 'worker' | 'device' | 'none' }> {
  if (workerOrigin() && !workerDown) {
    try {
      await playWorker(text, opts)
      return { source: 'worker' }
    } catch {
      workerDown = true
    }
  }
  return speakDevice(text, opts)
}

async function speakDevice(text: string, opts: { lang: Lang; voice: Voice; rate: 1 | 0.75 }): Promise<{ source: 'device' | 'none' }> {
  const v = await pickVoice(opts.lang, opts.voice)
  if (!v) return Promise.resolve({ source: 'none' })
  stopSpeaking()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.voice = v
    u.lang = v.lang
    u.rate = opts.rate
    u.onend = () => resolve({ source: 'device' })
    u.onerror = () => resolve({ source: 'device' })
    speechSynthesis.speak(u)
  })
}
