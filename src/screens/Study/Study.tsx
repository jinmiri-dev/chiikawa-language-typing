import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, FriendBubble, FriendImage, StatusNotice, Sentences } from '../../components/components'
import KeyboardMap from '../../components/KeyboardMap'
import { pickLine, STAGE_LINES, type FriendLine, type Situation } from '../../content/friendLines'
import { clockEvent, stageOf, type ClockState } from '../../engine/friend/clock'
import { nextHintLevel, type HintLevel, type HintMemory } from '../../engine/hint/hint'
import { explainMistake } from '../../engine/judge/explain'
import { judge, significantChars } from '../../engine/judge/judge'
import { DEFAULT_LAYOUT, getLayout, LAYOUT_LABEL, layoutsFor } from '../../engine/layouts'
import { LANG_NAME } from '../../engine/lang'
import { guideFor, guideText, stepSpeech } from '../../engine/layouts/guide'
import { newReviewItem, reviewId, schedule } from '../../engine/review/schedule'
import { avgLineMs } from '../../engine/stats/compare'
import { dayKey } from '../../engine/stats/trend'
import type { LayoutId, LineResult, Material, Progress, Segment, Word } from '../../engine/types'
import { sentenceGroups } from '../../engine/text'
import { getMaterial } from '../../services/materials'
import YouTubePlayer, { type PlayerHandle } from '../../components/YouTubePlayer'
import { workerOrigin } from '../../services/api'
import { speak, stopSpeaking } from '../../services/speech'
import { syncStep } from '../../services/youtubeSync'
import KeyboardSheet from './KeyboardSheet'
import { lineRecorder } from './lineRecorder'
import WordDrawer from './WordDrawer'
import { REVIEW_ID } from '../../services/review'
import './Study.css'

const LEVEL_NAME: Record<HintLevel, string> = { full: '전체', line: '한 줄', off: '없음' }
/** 움직임 줄이기를 켜면 이 상황에서만 말한다(캐릭터-말투 2장) */
const CALM: Situation[] = ['hello', 'step', 'rest', 'sixty', 'finish']

function useDevice(setting: 'auto' | 'pc' | 'mobile'): 'pc' | 'mobile' {
  const [coarse] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches)
  return setting === 'auto' ? (coarse ? 'mobile' : 'pc') : setting
}

/** 휴대폰 키보드가 올라오면 보이는 높이를 --vvh 에 넣는다(프론트-설계 7장) */
function useVisualViewport() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const set = () => document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
    set()
    vv.addEventListener('resize', set)
    return () => vv.removeEventListener('resize', set)
  }, [])
}

/** 조각마다 원문에서 시작 위치 */
function segmentStarts(segs: Segment[]): number[] {
  let at = 0
  return segs.map((s) => {
    const start = at
    at += s.text.length
    return start
  })
}

/** 원문 위에 보이는 읽기: 일본어 후리가나, 중국어 병음, 대만어 주음, 몽골어 로마자 전사, 영어 없음 */
function rubyOf(lang: Material['lang'], g: Segment): string | undefined {
  if (lang === 'tw') return g.zhuyin
  if (lang === 'mn') return g.romaji
  if (lang === 'en') return undefined
  return g.reading && g.reading !== g.text ? g.reading : undefined
}

function minutes(ms: number) {
  return `${Math.floor(ms / 60000)}분`
}

export default function Study({ materialId }: { materialId: string }) {
  const { store } = useApp()
  const [loaded, setLoaded] = useState<{ material: Material | null; initial: Progress | null } | undefined>(undefined)
  useEffect(() => {
    void Promise.all([getMaterial(store, materialId), store.getProgress(materialId)]).then(([material, initial]) => setLoaded({ material, initial }))
  }, [store, materialId])
  if (loaded === undefined) return null
  const { material, initial } = loaded
  if (!material)
    return (
      <main className="app">
        <section className="center">
          <h1>연습 재료를 찾을 수 없어요</h1>
          <a className="link" href="#/">
            처음으로
          </a>
        </section>
      </main>
    )
  return <StudyView material={material} initial={initial} />
}

function StudyView({ material, initial }: { material: Material; initial: Progress | null }) {
  const { store, settings, setSettings } = useApp()
  const device = useDevice(settings.device)
  useVisualViewport()
  const reduceMotion = settings.reduceMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)

  // 다 친 재료를 다시 열면 처음부터, 지난 회차 평균은 비교용으로 남긴다
  const restart = !!initial && initial.lineIndex >= material.lines.length
  const prevAvgMs = restart && initial!.results.length ? initial!.results.reduce((a, r) => a + r.ms, 0) / initial!.results.length : initial?.prevAvgMs
  const [idx, setIdx] = useState(restart ? 0 : (initial?.lineIndex ?? 0))
  const [results, setResults] = useState<LineResult[]>(restart ? [] : (initial?.results ?? []))
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')
  const [composing, setComposing] = useState('')
  const [lineDone, setLineDone] = useState(false)
  const [videoSaved, setVideoSaved] = useState(false)
  useEffect(() => {
    if (material.youtubeId) void store.listSaved(material.lang).then((list) => setVideoSaved(list.some((v) => v.videoId === material.youtubeId)))
  }, [store, material])
  /** 이 줄에서 이미 읽어 준 마지막 단어 조각 */
  const spokenSeg = useRef(-1)
  /** 자동으로 넘어갈 때 그 사이 다른 줄로 옮겼는지 보려고 */
  const idxRef = useRef(idx)
  idxRef.current = idx
  const [hintMem, setHintMem] = useState<HintMemory>({})
  const [lastInputAt, setLastInputAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [bubble, setBubble] = useState<{ line: FriendLine | null; at: number }>({ line: null, at: 0 })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  const [mobileMap, setMobileMap] = useState(false)
  const [words, setWords] = useState<Word[]>([])
  const [wordsOpen, setWordsOpen] = useState(false)

  const composingRef = useRef(false)
  const clock = useRef<ClockState>({ activeMs: initial?.activeMs ?? 0, lastAt: null })
  const [activeMs, setActiveMs] = useState(clock.current.activeMs)
  const shownStage = useRef(stageOf(clock.current.activeMs))
  const lastSaid = useRef<string | undefined>(undefined)
  const linesSinceChat = useRef(0)
  const streak = useRef(0)
  const oopsSaid = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const player = useRef<PlayerHandle>(null)

  const line = material.lines[idx]
  const recorder = useMemo(() => lineRecorder(line.src, settings.strict), [line, settings.strict])

  const lang = material.lang
  const htmlLang = LANG_NAME[lang].htmlLang
  const saved = settings.layout[lang]
  const layoutId: LayoutId = saved && getLayout(saved).lang === lang && getLayout(saved).device === device ? saved : DEFAULT_LAYOUT[lang][device]
  const layout = getLayout(layoutId)

  const say = useCallback(
    (situation: Situation, override?: FriendLine) => {
      if (reduceMotion && !CALM.includes(situation)) return
      const l = override ?? pickLine(settings.friend, situation, lastSaid.current)
      lastSaid.current = l.text
      setBubble({ line: l, at: Date.now() })
    },
    [reduceMotion, settings.friend],
  )

  useEffect(() => {
    void store.listWords(material.lang).then(setWords)
  }, [store, material.lang])
  const savedText = useMemo(() => new Set(words.map((w) => w.text)), [words])
  const isReview = material.id === REVIEW_ID

  // 처음 들어왔을 때 인사(복습이면 복습 인사), 휴대폰에서 일본어 키보드를 처음 고를 때 시트
  useEffect(() => {
    say(isReview ? 'review' : 'hello')
    if (device === 'mobile' && !settings.layout[material.lang]) setSheetOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 1초마다 다시 그려 2초 멈춤(안내 다시 보이기)을 반영한다
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    const onVis = () => {
      clock.current = clockEvent(clock.current, Date.now(), document.hidden ? 'hide' : 'show')
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  /** 이 줄 듣기. 다 들으면 풀린다(자동으로 다음 줄로 넘어갈 때 기다린다). */
  const listen = useCallback(async () => {
    // 유튜브 재료는 영상의 그 줄 구간을 들려준다
    if (material.youtubeId && line.start !== undefined && player.current) {
      setVoiceNote('')
      await player.current.playSegment(line.start, line.end ?? line.start + 5, settings.rate)
      return
    }
    const r = await speak(line.src, { lang: material.lang, voice: settings.voice[material.lang] ?? 'female', rate: settings.rate })
    setVoiceNote(
      r.source === 'none'
        ? `이 기기에는 ${LANG_NAME[material.lang].ko} 목소리가 없어요. 다른 브라우저에서 들어 보세요.`
        : r.source === 'device' && workerOrigin()
          ? '기기 목소리로 읽고 있어요.'
          : '',
    )
  }, [line, material, settings.voice, settings.rate])

  // 유튜브 재료: 영상이 지금 줄 끝을 지나면 멈추고, 진행 막대를 끌어 다른 줄로 가면 그 줄로(함께 가기)
  const lastVideoT = useRef(0)
  const onVideoTime = (t: number) => {
    const prevT = lastVideoT.current
    lastVideoT.current = t
    const step = syncStep(material.lines, idxRef.current, prevT, t)
    if (step.pause) player.current?.pause()
    if (step.goTo !== undefined) setIdx(step.goTo)
  }

  // 0.75배를 누르면 그 빠르기로 바로 다시 들려준다(눌렀는데 아무 일 없지 않게)
  const firstRate = useRef(true)
  useEffect(() => {
    if (firstRate.current) {
      firstRate.current = false
      return
    }
    void listen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.rate])

  // 줄이 바뀌면 입력을 비우고, 설정이 켜져 있으면 듣기
  useEffect(() => {
    setValue('')
    setCommitted('')
    setComposing('')
    setLineDone(false)
    oopsSaid.current = false
    spokenSeg.current = -1
    stopSpeaking()
    // 줄 시작 때 자동으로 듣기: 설정, 또는 유튜브 재료는 기본으로(기획안 10장)
    if (settings.autoListen || material.kind === 'youtube') void listen()
    inputRef.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const res = judge(line.src, committed, { strict: settings.strict })
  const starts = segmentStarts(line.segments)
  const segIndex = res.done ? -1 : Math.max(0, starts.findLastIndex((s) => s <= res.okUpTo))
  const seg = segIndex >= 0 ? line.segments[segIndex] : null
  const strip = (s: string) => significantChars(s, settings.strict).join('')
  const mistake = res.wrongAt !== undefined ? explainMistake(lang, strip(line.src), strip(committed)) : null

  // 지금 칠 조각의 안내
  const inSeg = seg ? res.okUpTo - starts[segIndex] : 0
  const segComposing = seg && seg.text === seg.reading ? seg.text.slice(0, inSeg) + composing : composing
  const guide = seg && seg.confident && layout.verified ? guideFor(layout, seg, segComposing) : null
  const nextStep = guide?.steps[guide.nextIndex]

  // 단어를 다 칠 때마다 그 단어를 읽어 준다(타자 게임처럼). 줄을 다 치면 줄 전체를 들려주니 그때는 읽지 않는다.
  useEffect(() => {
    if (!settings.speakWords || res.done) return
    let last = spokenSeg.current
    line.segments.forEach((s, i) => {
      if (s.isWord && starts[i] + s.text.length <= res.okUpTo) last = Math.max(last, i)
    })
    if (last <= spokenSeg.current) return
    const words = line.segments.slice(spokenSeg.current + 1, last + 1).filter((s) => s.isWord).map((s) => s.text)
    spokenSeg.current = last
    void speak(words.join(material.lang === 'en' || material.lang === 'mn' ? ' ' : ''), { lang: material.lang, voice: settings.voice[material.lang] ?? 'female', rate: settings.rate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [res.okUpTo, res.done, idx])
  const idle = now - lastInputAt >= 2000
  const fading = seg ? (hintMem[seg.reading ?? seg.text]?.level ?? 'full') : 'full'
  const level: HintLevel = !settings.hintFading ? settings.hintMode : idle || mistake ? 'full' : fading

  /** 단어(또는 줄 전체)를 담고, 그 줄을 복습에 넣는다. 다시 누르면 뺀다. */
  async function toggleWord(text: string, reading: string | undefined, wholeLine: boolean) {
    const id = wholeLine ? `${material.id}|${line.id}` : `${material.lang}:${text}`
    const exists = words.find((w) => w.id === id)
    if (exists) {
      await store.deleteWord(id)
      setWords((ws) => ws.filter((w) => w.id !== id))
    } else {
      const w: Word = {
        id, lang: material.lang, text, ...(reading && reading !== text ? { reading } : {}),
        from: refOf(), wholeLine, savedAt: Date.now(),
        example: { src: line.src, ...(line.ko ? { ko: line.ko } : {}), segments: line.segments },
      }
      await store.saveWord(w)
      await addReview()
      setWords((ws) => [...ws, w])
    }
    inputRef.current?.focus({ preventScroll: true })
  }

  /** 이 줄이 원래 어느 재료의 몇째 줄인가(복습 재료의 줄은 원래 위치를 id 에 담고 있다) */
  function refOf() {
    if (isReview) {
      const [materialId, lineId] = line.id.split('|')
      return { materialId, lineId }
    }
    return { materialId: material.id, lineId: line.id }
  }

  async function addReview() {
    const ref = refOf()
    const existing = (await store.listReview()).find((r) => r.id === reviewId(ref))
    if (!existing) await store.saveReview(newReviewItem(ref, Date.now()))
  }

  function persist(nextIdx: number, nextResults: LineResult[]) {
    void store.saveProgress({
      materialId: material.id,
      lineIndex: nextIdx,
      results: nextResults,
      activeMs: clock.current.activeMs,
      friend: settings.friend,
      updatedAt: Date.now(),
      ...(prevAvgMs !== undefined ? { prevAvgMs } : {}),
    })
  }

  function finishLine(t: number) {
    const r = recorder.result(line.id, t)
    const nextResults = [...results.filter((x) => x.lineId !== line.id), r]
    const before = results.find((x) => x.lineId === line.id)
    setResults(nextResults)
    setLineDone(true)
    // 친 글자와 소리를 잇도록 맞힌 줄을 한 번 더 들려주고, 다 들으면 다음 줄로(그 사이 Enter 를 누르면 바로)
    const doneAt = idx
    void (async () => {
      if (settings.listenAfter) await listen()
      if (!settings.autoNext) return
      await new Promise((r) => setTimeout(r, settings.listenAfter ? 600 : 900))
      if (idxRef.current === doneAt) goTo(doneAt + 1)
    })()
    persist(idx + 1, nextResults)
    // 복습: 이 줄의 일정을 다시 잡는다. 일반 연습: 틀린 줄은 복습에 넣는다.
    if (isReview)
      void store.listReview().then((list) => {
        const item = list.find((x) => x.id === line.id)
        if (item) void store.saveReview(schedule(item, r.mistakes === 0, t))
      })
    else if (r.mistakes > 0) void addReview()
    // 효과 기록: 기본 연습 세트를 끝낼 때마다 한 줄 평균 시간과 정확도
    if (material.kind === 'starter' && idx + 1 >= material.lines.length)
      void store.addStat({
        id: `${material.id}:${t}`,
        lang: material.lang,
        day: dayKey(t),
        avgMs: avgLineMs(nextResults),
        accuracy: nextResults.reduce((a, x) => a + x.firstTryAccuracy, 0) / nextResults.length,
      })

    // 친구 반응: 5분 단계가 바뀌었으면 그것만, 아니면 연속·다시 맞힘·가끔 한마디
    const stage = stageOf(clock.current.activeMs)
    if (stage > shownStage.current) {
      shownStage.current = stage
      const s = STAGE_LINES[settings.friend][stage]
      say(stage === 6 ? 'rest' : stage === 12 ? 'sixty' : 'step', { text: s.line, action: s.pose })
      return
    }
    streak.current = r.mistakes === 0 ? streak.current + 1 : 0
    linesSinceChat.current++
    if (streak.current > 0 && streak.current % 3 === 0) say('streak')
    else if (before && before.mistakes > 0 && r.mistakes === 0) say('comeback')
    else if (linesSinceChat.current >= 5) {
      linesSinceChat.current = 0
      say('line')
    }
  }

  function commit(v: string) {
    if (lineDone) return
    const t = Date.now()
    clock.current = clockEvent(clock.current, t, 'input')
    setActiveMs(clock.current.activeMs)
    setLastInputAt(t)
    setCommitted(v)
    recorder.onCommit(v, t)
    const r = judge(line.src, v, { strict: settings.strict })

    // 안내 줄이기: 새로 지나간 조각은 맞음, 틀린 자리가 있는 조각은 틀림
    if (seg) {
      const key = seg.reading ?? seg.text
      const segEnd = starts[segIndex] + seg.text.length
      if (r.wrongAt !== undefined && r.wrongAt < segEnd) setHintMem((m) => nextHintLevel(m, key, false, 0).mem)
      else if (r.okUpTo >= segEnd) setHintMem((m) => nextHintLevel(m, key, true, t - lastInputAt).mem)
    }
    if (r.wrongAt !== undefined && recorder.mistakes >= 2 && !oopsSaid.current) {
      oopsSaid.current = true
      say('oops')
    }
    if (r.done) finishLine(t)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
    if (!composingRef.current && !(e.nativeEvent as InputEvent).isComposing) commit(e.target.value)
  }
  const onCompositionStart = () => {
    composingRef.current = true
  }
  const onCompositionUpdate = (e: CompositionEvent<HTMLInputElement>) => {
    setComposing(e.data)
    setLastInputAt(Date.now())
  }
  const onCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false
    setComposing('')
    commit(e.currentTarget.value)
  }

  const goTo = useCallback(
    (n: number) => {
      if (n >= material.lines.length) {
        location.hash = href({ name: 'done', materialId: material.id })
        return
      }
      setIdx(Math.max(0, n))
    },
    [material],
  )

  // 단축키(PC): Enter 다음 줄, Ctrl+Space 듣기, Ctrl+←/→ 이전·다음 줄
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key === 'Enter' && lineDone) {
        e.preventDefault()
        goTo(idx + 1)
      } else if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault()
        void listen()
      } else if (e.ctrlKey && e.key === 'ArrowLeft') goTo(idx - 1)
      else if (e.ctrlKey && e.key === 'ArrowRight') goTo(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lineDone, idx, goTo, listen])

  /** 유튜브 재료: 연습하다가 영상을 저장(유튜브 탭의 '저장한 영상'에 모인다) */
  async function toggleVideo() {
    const videoId = material.youtubeId!
    const id = `${material.lang}:${videoId}`
    if (videoSaved) await store.deleteSaved(id)
    else
      await store.saveVideo({ id, lang: material.lang, videoId, title: material.title, channel: '', thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`, durationSec: 0, savedAt: Date.now() })
    setVideoSaved(!videoSaved)
  }

  const lineSaved = words.some((w) => w.id === `${material.id}|${line.id}`)
  const progressText = `${Math.min(idx + 1, material.lines.length)} / ${material.lines.length}줄`
  const stage = stageOf(activeMs)
  const prev = material.lines[idx - 1]

  function renderSeg(g: Segment, si: number) {
    const chars = [...g.text].map((ch, ci) => {
      const at = starts[si] + ci
      const state = res.done || at < res.okUpTo ? 'done' : at === res.wrongAt ? 'wrong' : at === res.okUpTo ? 'now' : 'rest'
      return (
        <span key={ci} className={`ch ch-${state}`} data-wrong={state === 'wrong' || undefined}>
          {ch}
        </span>
      )
    })
    const ruby = settings.show.reading ? rubyOf(lang, g) : undefined
    const body = ruby ? (
      <ruby>
        {chars}
        <rt>{ruby}</rt>
      </ruby>
    ) : (
      chars
    )
    return g.isWord ? (
      <button
        key={si}
        type="button"
        className="word"
        data-saved={savedText.has(g.text) || undefined}
        aria-label={`${g.text} ${savedText.has(g.text) ? '단어장에서 빼기' : '단어장에 담기'}`}
        onClick={() => void toggleWord(g.text, g.reading, false)}
      >
        {body}
      </button>
    ) : (
      <span key={si}>{body}</span>
    )
  }

  const sentence = (
    <div className="sentence" lang={htmlLang}>
      {settings.show.src && (
        <p className="sentence-src">
          {/* 문장마다 묶어 문장 가운데서 줄이 바뀌지 않게 한다 */}
          {sentenceGroups(line.segments).map((group, gi) =>
            group === ' ' ? (
              ' '
            ) : (
              <span key={gi} className="sent">
                {group.map((si) => renderSeg(line.segments[si], si))}
              </span>
            ),
          )}
        </p>
      )}
      {settings.show.ko && line.ko && (
        <p className="sentence-ko" lang="ko">
          <Sentences text={line.ko} />
        </p>
      )}
    </div>
  )

  const input = (
    <div className="type-row">
      <input
        ref={inputRef}
        className="type-input"
        aria-label="여기에 쳐 보세요"
        lang={htmlLang}
        value={value}
        onChange={onChange}
        onCompositionStart={onCompositionStart}
        onCompositionUpdate={onCompositionUpdate}
        onCompositionEnd={onCompositionEnd}
        onFocus={(e) => e.currentTarget.scrollIntoView?.({ block: 'nearest' })}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="next"
        readOnly={lineDone}
      />
      {device === 'mobile' && (
        <button type="button" className="btn btn-sub layout-btn" onClick={() => setSheetOpen(true)}>
          {LAYOUT_LABEL[layoutId].name} ▾
        </button>
      )}
    </div>
  )

  const status = (
    <div className="judge" aria-live="polite">
      {lineDone ? (
        <div className="judge-ok">
          <b>✓ 맞았어요</b>
          <button type="button" className="btn btn-primary" onClick={() => goTo(idx + 1)}>
            {idx + 1 >= material.lines.length ? '다 쳤어요 · 결과 보기' : '다음 줄'} <span className="key-hint">Enter</span>
          </button>
        </div>
      ) : mistake ? (
        <p className="judge-wrong">✕ {mistake} 지우고 다시 쳐 보세요.</p>
      ) : null}
    </div>
  )

  const guidePanel = !seg ? null : !seg.confident ? (
    <StatusNotice title="읽기를 확인하지 못한 줄이에요">
      {(material.kind === 'script' ? '대본 정리 화면에서 읽기를 고치면 키 안내가 나와요. ' : '') + '타자와 채점은 그대로 돼요.'}
    </StatusNotice>
  ) : !layout.verified ? (
    <StatusNotice title="이 키보드는 안내를 준비하고 있어요">타자와 채점은 그대로 돼요. 입력 시험 결과를 받으면 키 안내를 열어요.</StatusNotice>
  ) : (
    <div className="guide">
      {level !== 'off' ? (
        <p className="guide-line" lang={htmlLang}>
          {guideText(layout, seg)}
        </p>
      ) : (
        <p className="guide-off"><Sentences text="안내 없이 쳐 봐요. 멈추면 다시 알려 줘요." /></p>
      )}
      <p className="sr-only" aria-live="polite">
        {level !== 'off' ? stepSpeech(layout, nextStep) : ''}
      </p>
      {level === 'full' && (device === 'pc' || mobileMap) && <KeyboardMap layout={layout} next={nextStep} small={device === 'mobile'} />}
      {device === 'mobile' && level === 'full' && (
        <button type="button" className="btn btn-sub map-toggle" onClick={() => setMobileMap((v) => !v)} aria-expanded={mobileMap}>
          {mobileMap ? '자판 그림 접기' : '자판 그림 보기'}
        </button>
      )}
    </div>
  )

  // 조작은 한곳에: 입력칸 바로 아래 한 줄(PC). 키보드가 하나뿐이면 바꾸기 버튼은 두지 않는다
  const canChangeKeyboard = layoutsFor(lang, device).length > 1
  const toolbar = (
    <div className="study-toolbar" role="group" aria-label="조작">
      <div className="tb-group">
        <button type="button" className="btn btn-sub" onClick={() => void listen()}>
          ▶ 다시 듣기 <span className="key-hint">Ctrl+Space</span>
        </button>
        {/* 누르면 0.75배, 다시 누르면 보통 빠르기. 지금 상태를 글로도 보여 준다 */}
        <button type="button" className="btn btn-sub tb-toggle" aria-pressed={settings.rate === 0.75} onClick={() => setSettings({ rate: settings.rate === 1 ? 0.75 : 1 })}>
          {settings.rate === 0.75 ? '✓ 0.75배 켜짐' : '0.75배'}
        </button>
      </div>
      <div className="tb-group">
        <button type="button" className="btn btn-sub" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
          ← 이전 줄
        </button>
        <button type="button" className="btn btn-sub" onClick={() => goTo(idx + 1)}>
          다음 줄 →
        </button>
        <button type="button" className="btn btn-sub" aria-pressed={lineSaved} onClick={() => void toggleWord(line.src, undefined, true)}>
          {lineSaved ? '✓ 담은 줄' : '이 줄 담기'}
        </button>
      </div>
      <div className="tb-group tb-keyboard">
        {canChangeKeyboard ? (
          <button type="button" className="btn btn-sub" onClick={() => setSheetOpen(true)}>
            ⌨ {LAYOUT_LABEL[layoutId].name}
          </button>
        ) : (
          <span className="tb-note">⌨ {LAYOUT_LABEL[layoutId].name}</span>
        )}
        <span className="tb-note">안내 {LEVEL_NAME[level]}</span>
      </div>
      {voiceNote && <p className="ctl-note"><Sentences text={voiceNote} /></p>}
    </div>
  )

  return (
    <div className={`study study-${device}`}>
      <AppHeader
        back={isReview ? '#/' : href({ name: 'materials', lang: material.lang, tab: material.kind })}
        title={<span className="study-title">{material.title}</span>}
        right={
          <>
            <span className="study-meta">{progressText}</span>
            {material.youtubeId && (
              <button type="button" className="study-words" aria-pressed={videoSaved} aria-label={videoSaved ? '영상 저장 취소' : '영상 저장'} onClick={() => void toggleVideo()}>
                {videoSaved ? '★' : '☆'}
              </button>
            )}
            <button type="button" className="study-words" onClick={() => setWordsOpen(true)}>
              단어 {words.length}
            </button>
            {device === 'mobile' ? (
              <a href="#/friend" className="study-face" aria-label="친구 바꾸기">
                <FriendImage friend={settings.friend} stage={stage} size={40} cue={bubble.at} />
              </a>
            ) : (
              <a href="#/settings">설정</a>
            )}
          </>
        }
      />
      {device === 'pc' ? (
        <main className="study-grid">
          <aside className="study-friend" aria-label="함께하는 친구">
            <FriendBubble line={bubble.line} shownAt={bubble.at} />
            <FriendImage friend={settings.friend} stage={stage} size={168} cue={bubble.at} />
            <p className="study-time">연습 시간 {minutes(activeMs)}</p>
            <a className="btn btn-sub" href="#/friend">
              친구 바꾸기
            </a>
          </aside>
          <section className="study-center">
            {material.youtubeId && <YouTubePlayer ref={player} videoId={material.youtubeId} title={material.title} onTime={onVideoTime} />}
            {prev && (
              <p className="sentence-prev" lang={htmlLang}>
                {prev.src}
              </p>
            )}
            {sentence}
            {input}
            {status}
            {toolbar}
            {guidePanel}
          </section>
        </main>
      ) : (
        <main className="study-mobile">
          {material.youtubeId && <YouTubePlayer ref={player} videoId={material.youtubeId} title={material.title} onTime={onVideoTime} />}
          {sentence}
          {input}
          {status}
          {guidePanel}
          <div className="ctl-row ctl-mobile">
            <button type="button" className="btn btn-sub" onClick={() => void listen()}>
              ▶ 듣기
            </button>
            <button type="button" className="btn btn-sub" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
              ← 이전
            </button>
            <button type="button" className="btn btn-sub" onClick={() => goTo(idx + 1)}>
              다음 →
            </button>
            <button type="button" className="btn btn-sub" aria-pressed={lineSaved} onClick={() => void toggleWord(line.src, undefined, true)}>
              {lineSaved ? '✓ 담음' : '줄 담기'}
            </button>
          </div>
          {voiceNote && <p className="ctl-note"><Sentences text={voiceNote} /></p>}
          {/* 말풍선은 문장을 가리거나 밀지 않게 조작 버튼 아래에 둔다 */}
          <FriendBubble line={bubble.line} shownAt={bubble.at} />
        </main>
      )}
      <WordDrawer
        open={wordsOpen}
        lang={material.lang}
        words={words}
        onClose={() => setWordsOpen(false)}
        onChange={(w) => {
          void store.saveWord(w)
          setWords((ws) => ws.map((x) => (x.id === w.id ? w : x)))
        }}
        onDelete={(id) => {
          void store.deleteWord(id)
          setWords((ws) => ws.filter((x) => x.id !== id))
        }}
      />
      <KeyboardSheet
        open={sheetOpen}
        device={device}
        current={layoutId}
        onClose={() => setSheetOpen(false)}
        onPick={(id) => {
          setSettings({ layout: { ...settings.layout, [lang]: id } })
          setSheetOpen(false)
        }}
        lang={lang}
        layouts={layoutsFor(lang, device)}
      />
    </div>
  )
}
