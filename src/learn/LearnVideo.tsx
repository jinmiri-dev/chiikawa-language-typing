/**
 * 외국인 한국어 배우기: 가사 보기(#/learn/<모국어>/v/<영상>).
 * 듣기(멈추지 않고 이어 재생, 지금 줄 강조) → 한 줄씩(줄 3번 반복) → 따라 부르기(빈칸).
 */
import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/AppState'
import { href } from '../app/routes'
import { AppHeader } from '../components/components'
import YouTubePlayer, { type PlayerHandle } from '../components/YouTubePlayer'
import { LEARN_VIDEOS } from '../content/learnVideos'
import type { Lang } from '../engine/lang'
import { ApiFailure, getLyrics, type LyricsResult } from '../services/api'
import { speakKo, stopSpeaking } from '../services/speech'
import { romanize, stripParticle } from './hangul'
import { LEARN_TEXT, type LearnText } from './i18n'
import { addLearnWord, listSentences, toggleSentence } from './learnStore'
import './learn.css'

type Mode = 'listen' | 'line' | 'sing'
const RATES = [0.5, 0.75, 1, 1.25] as const
const HANGUL = /[가-힣]/

function errorText(e: unknown, t: LearnText): string {
  const code = e instanceof ApiFailure ? e.code : ''
  if (code === 'NO_TRACK') return t.errors.noTrack
  if (code === 'QUOTA_EXCEEDED') return t.errors.quota
  if (code === 'EMBED_BLOCKED') return t.errors.blocked
  if (code === 'NOT_CONNECTED' || code === 'NOT_CONFIGURED' || code === 'OFFLINE') return t.errors.notConnected
  return t.errors.other
}

/** 낱말 앞뒤 문장부호를 뗀 소리 낼 글 */
const bare = (w: string) => w.replace(/^[^가-힣A-Za-z0-9]+|[^가-힣A-Za-z0-9]+$/g, '')

/** 따라 부르기에서 가릴 낱말: 한글 두 글자 이상인 낱말 중 하나 걸러 하나 */
const blanked = (tokens: string[]) => {
  let n = 0
  return tokens.map((w) => {
    if (!w.trim() || [...bare(w)].filter((c) => HANGUL.test(c)).length < 2) return false
    return n++ % 2 === 1
  })
}

export default function LearnVideo({ native, videoId }: { native: Lang; videoId: string }) {
  const { store } = useApp()
  const t = LEARN_TEXT[native]
  const meta = LEARN_VIDEOS.find((v) => v.videoId === videoId)
  const title = meta?.title ?? 'YouTube'
  const [data, setData] = useState<LyricsResult | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<Mode>('listen')
  const [rate, setRate] = useState<number>(1)
  const [show, setShow] = useState({ meaning: true, sound: true })
  const [cur, setCur] = useState(-1)
  const [repeat, setRepeat] = useState<{ i: number; n: number } | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState('')
  const player = useRef<PlayerHandle>(null)
  const lineRefs = useRef<(HTMLLIElement | null)[]>([])
  const runId = useRef(0)

  useEffect(() => {
    getLyrics(native, videoId).then(setData, (e) => setError(errorText(e, t)))
    void listSentences(store).then((list) => setSaved(new Set(list.filter((s) => s.videoId === videoId).map((s) => s.id))))
    return () => stopSpeaking()
  }, [native, videoId, store, t])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(''), 2000)
    return () => clearTimeout(id)
  }, [toast])

  // 지금 부르는 줄을 화면 가운데로(한 줄씩 모드에서는 누른 줄에 머문다)
  useEffect(() => {
    if (cur < 0 || mode === 'line') return
    lineRefs.current[cur]?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [cur, mode])

  const lines = data?.lines ?? []
  const onTime = (sec: number) => {
    let i = -1
    for (let k = 0; k < lines.length; k++) if (lines[k].start <= sec + 0.1) i = k
    if (i >= 0 && sec > lines[i].end + 1.5) i = -1
    setCur((c) => (c === i ? c : i))
  }

  function changeRate(r: number) {
    setRate(r)
    player.current?.setRate(r)
  }

  async function openLine(i: number) {
    const l = lines[i]
    setCur(i)
    const id = ++runId.current
    if (mode !== 'line') {
      setRepeat(null)
      player.current?.setRate(rate)
      player.current?.playFrom(l.start)
      return
    }
    for (let n = 1; n <= 3 && id === runId.current; n++) {
      setRepeat({ i, n })
      await player.current?.playSegment(l.start, l.end, rate)
    }
    if (id === runId.current) setRepeat(null)
  }

  function sayWord(w: string, line: { start: number }) {
    const word = bare(w)
    if (!word) return
    void speakKo(word, 0.85)
    const base = stripParticle(word)
    void addLearnWord(store, { word: base, seen: word, videoId, start: line.start, savedAt: Date.now() })
    setToast(t.wordAdded(base))
  }

  async function save(l: LyricsResult['lines'][number]) {
    const id = `${videoId}|${l.start}`
    const on = await toggleSentence(store, { id, videoId, title, ko: l.ko, meanings: l.meaning ? { [native]: l.meaning } : {}, start: l.start, savedAt: Date.now() })
    setSaved((s) => {
      const next = new Set(s)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  }

  return (
    <div className="page" lang={t.htmlLang}>
      <AppHeader
        back={href({ name: 'learn-list', native })}
        title={<span className="logo-sub" lang="ko">{title}</span>}
        right={
          <a href={href({ name: 'learn-sheet', native })}>
            {t.worksheet} {saved.size > 0 && <span className="learn-count">{saved.size}</span>}
          </a>
        }
      />
      <main className="learn-video">
        <div className="learn-stage">
          <YouTubePlayer ref={player} videoId={videoId} title={title} onTime={onTime} />
          <div className="learn-modes" role="tablist" aria-label={t.modes.listen}>
            {(['listen', 'line', 'sing'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                className="learn-mode"
                onClick={() => {
                  runId.current++
                  setRepeat(null)
                  setMode(m)
                  setRevealed(new Set())
                }}
              >
                {t.modes[m]}
              </button>
            ))}
          </div>
          <p className="learn-help">{t.modeHelp[mode]}</p>
          <div className="learn-controls">
            <div className="learn-rates" role="group" aria-label={t.speed}>
              <span>{t.speed}</span>
              {RATES.map((r) => (
                <button key={r} type="button" className="chip-btn" aria-pressed={rate === r} onClick={() => changeRate(r)}>
                  {r}×
                </button>
              ))}
            </div>
          </div>
        </div>

        <section className="learn-lyrics" aria-live="off">
          {error ? (
            <p className="learn-error">{error}</p>
          ) : !data ? (
            <p className="busy">{t.loading}</p>
          ) : (
            <>
              <div className="learn-lyrics-head">
                <p className="learn-tip">{mode === 'sing' ? t.tapBlank : t.tapWord}</p>
                <div className="learn-toggles">
                  <button type="button" className="chip-btn" aria-pressed={show.meaning} onClick={() => setShow((s) => ({ ...s, meaning: !s.meaning }))}>
                    {t.showMeaning}
                  </button>
                  <button type="button" className="chip-btn" aria-pressed={show.sound} onClick={() => setShow((s) => ({ ...s, sound: !s.sound }))}>
                    {t.showSound}
                  </button>
                </div>
              </div>
              {data.meaningSource === 'none' && show.meaning && <p className="learn-tip">{t.noMeaning}</p>}
              <ol className="learn-lines">
                {lines.map((l, i) => {
                  const tokens = l.ko.split(/(\s+)/)
                  const hide = mode === 'sing' ? blanked(tokens) : tokens.map(() => false)
                  const id = `${videoId}|${l.start}`
                  return (
                    <li key={id} ref={(el) => void (lineRefs.current[i] = el)} className="learn-line" data-current={cur === i || undefined}>
                      <div className="learn-line-main">
                        <button type="button" className="learn-play" aria-label={mode === 'line' ? t.repeat3 : t.playLine} onClick={() => void openLine(i)}>
                          {repeat?.i === i ? `${repeat.n}/3` : '▶'}
                        </button>
                        <div className="learn-text">
                          <p className="learn-ko" lang="ko">
                            {tokens.map((w, k) => {
                              if (!w.trim()) return w
                              const key = `${i}:${k}`
                              if (hide[k] && !revealed.has(key))
                                return (
                                  <button key={k} type="button" className="learn-blank" aria-label={t.tapBlank} onClick={() => setRevealed((s) => new Set(s).add(key))}>
                                    {'＿'.repeat([...bare(w)].length)}
                                  </button>
                                )
                              return (
                                <button key={k} type="button" className="learn-word" onClick={() => sayWord(w, l)}>
                                  {w}
                                </button>
                              )
                            })}
                          </p>
                          {show.sound && <p className="learn-sound" lang="ko-Latn">{romanize(l.ko)}</p>}
                          {show.meaning && l.meaning && <p className="learn-meaning">{l.meaning}</p>}
                        </div>
                        <div className="learn-line-tools">
                          <button type="button" className="learn-tool" aria-label={t.readLine} onClick={() => void speakKo(l.ko, 0.8)}>
                            🔊
                          </button>
                          <button type="button" className="learn-tool" aria-pressed={saved.has(id)} aria-label={saved.has(id) ? t.saved : t.save} onClick={() => void save(l)}>
                            {saved.has(id) ? '★' : '☆'}
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </section>
      </main>
      {toast && (
        <p className="learn-toast" role="status">
          {toast}
        </p>
      )}
    </div>
  )
}
