/**
 * 효과음(파일 없이 브라우저가 만든다): 맞게 친 글자 "톡", 틀림 "둥", 줄 끝 "딩동", 기록 갱신 "빠밤".
 * 소리는 작게, 설정의 효과음을 끄면 나지 않는다. 브라우저가 소리를 막아 두면 조용히 넘어간다.
 */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    const AC = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, dur: number, vol: number, type: OscillatorType = 'sine') {
  const a = audio()
  if (!a) return
  const t = a.currentTime + start
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export type Sfx = 'key' | 'wrong' | 'line' | 'record'

export function playSfx(kind: Sfx) {
  switch (kind) {
    case 'key':
      return tone(1100, 0, 0.04, 0.03, 'triangle')
    case 'wrong':
      return tone(180, 0, 0.14, 0.05, 'square')
    case 'line':
      tone(784, 0, 0.12, 0.06)
      return tone(1047, 0.1, 0.18, 0.06)
    case 'record':
      tone(659, 0, 0.1, 0.07)
      tone(784, 0.1, 0.1, 0.07)
      return tone(1319, 0.2, 0.3, 0.07)
  }
}
