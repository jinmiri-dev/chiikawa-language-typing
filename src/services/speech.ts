/** 듣기 (기획안 10장). 중계 함수의 Azure 목소리(여자/남자, 캐시)를 먼저 쓰고, 안 되면 기기 음성(speechSynthesis). */
import { LANG_NAME, type Lang } from '../engine/lang'
import { ttsUrl, workerOrigin } from './api'

type Voice = 'female' | 'male'

/** 이름으로 남녀를 가린다. 기기·브라우저마다 이름이 달라 흔한 것만 둔다. */
const NAME_HINT: Record<Voice, RegExp> = {
  female: /nanami|kyoko|haruka|ayumi|mizuki|aoi|xiaoxiao|xiaoyi|huihui|yaoyao|tingting|meijia|hsiaochen|hsiaoyu|hanhan|zira|aria|jenny|samantha|karen|moira|yesui|female|여자/i,
  male: /keita|otoya|ichiro|daichi|naoki|yunxi|yunyang|kangkang|yunjhe|zhiwei|david|guy|daniel|alex|fred|bataa|male|남자/i,
}

function voicesFor(lang: Lang): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  const prefix = LANG_NAME[lang].htmlLang.toLowerCase()
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(prefix))
}

function pickVoice(lang: Lang, voice: Voice): SpeechSynthesisVoice | null {
  const all = voicesFor(lang)
  // 'female' 이 'male' 을 포함하므로 남자 목소리는 여자 표에 걸리지 않는 것만
  const match = all.find((v) => NAME_HINT[voice].test(v.name) && (voice === 'female' || !NAME_HINT.female.test(v.name)))
  return match ?? all[0] ?? null
}

export async function canSpeak(lang: Lang): Promise<boolean> {
  return voicesFor(lang).length > 0
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

export async function speak(text: string, opts: { lang: Lang; voice: Voice; rate: 1 | 0.75 }): Promise<{ source: 'worker' | 'device' | 'none' }> {
  if (workerOrigin()) {
    try {
      await playWorker(text, opts)
      return { source: 'worker' }
    } catch {
      /* 기기 목소리로 */
    }
  }
  return speakDevice(text, opts)
}

function speakDevice(text: string, opts: { lang: Lang; voice: Voice; rate: 1 | 0.75 }): Promise<{ source: 'device' | 'none' }> {
  const v = pickVoice(opts.lang, opts.voice)
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
