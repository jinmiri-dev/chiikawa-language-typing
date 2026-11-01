import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CompositionEvent } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, FriendBubble, FriendImage, StatusNotice } from '../../components/components'
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
import { getMaterial } from '../../services/materials'
import { speak } from '../../services/speech'
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

  const listen = useCallback(async () => {
    const r = await speak(line.src, { lang: material.lang, voice: settings.voice[material.lang] ?? 'female', rate: settings.rate })
    setVoiceNote(r.source === 'none' ? `이 기기에는 ${LANG_NAME[material.lang].ko} 목소리가 없어요. 다른 브라우저에서 들어 보세요.` : '')
  }, [line.src, material.lang, settings.voice, settings.rate])

  // 줄이 바뀌면 입력을 비우고, 설정이 켜져 있으면 듣기
  useEffect(() => {
    setValue('')
    setCommitted('')
    setComposing('')
    setLineDone(false)
    oopsSaid.current = false
    if (settings.autoListen) void listen()
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

  const lineSaved = words.some((w) => w.id === `${material.id}|${line.id}`)
  const progressText = `${Math.min(idx + 1, material.lines.length)} / ${material.lines.length}줄`
  const stage = stageOf(activeMs)
  const prev = material.lines[idx - 1]

  const sentence = (
    <div className="sentence" lang={htmlLang}>
      {settings.show.src && (
        <p className="sentence-src">
          {line.segments.map((g, si) => {
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
          })}
        </p>
      )}
      {settings.show.ko && line.ko && (
        <p className="sentence-ko" lang="ko">
          {line.ko}
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
      {material.kind === 'script' ? '대본 정리 화면에서 읽기를 고치면 키 안내가 나와요. ' : ''}타자와 채점은 그대로 돼요.
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
        <p className="guide-off">안내 없이 쳐 봐요. 멈추면 다시 알려 줘요.</p>
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

  const listenGroup = (
    <div className="ctl-group" role="group" aria-label="듣기">
      <h2>듣기</h2>
      <button type="button" className="btn btn-sub" onClick={() => void listen()}>
        ▶ 다시 듣기
      </button>
      <div className="ctl-row">
        <button type="button" className="btn btn-sub" aria-pressed={settings.rate === 0.75} onClick={() => setSettings({ rate: settings.rate === 1 ? 0.75 : 1 })}>
          0.75배
        </button>
        <select
          className="btn btn-sub"
          aria-label="목소리"
          value={settings.voice[lang] ?? 'female'}
          onChange={(e) => setSettings({ voice: { ...settings.voice, [lang]: e.target.value as 'female' | 'male' } })}
        >
          <option value="female">여자 목소리</option>
          <option value="male">남자 목소리</option>
        </select>
      </div>
      {voiceNote && <p className="ctl-note">{voiceNote}</p>}
    </div>
  )

  const lineGroup = (
    <div className="ctl-group" role="group" aria-label="이 줄">
      <h2>이 줄</h2>
      <div className="ctl-row">
        <button type="button" className="btn btn-sub" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
          ← 이전 줄
        </button>
        <button type="button" className="btn btn-sub" onClick={() => goTo(idx + 1)}>
          건너뛰기 →
        </button>
      </div>
      <button type="button" className="btn btn-sub" aria-pressed={lineSaved} onClick={() => void toggleWord(line.src, undefined, true)}>
        {lineSaved ? '✓ 담은 줄' : '이 줄 담기'}
      </button>
      <p className="ctl-note">단어를 누르면 단어장에 담겨요.</p>
    </div>
  )

  const keyboardGroup = (
    <div className="ctl-group" role="group" aria-label="키보드">
      <h2>키보드</h2>
      <button type="button" className="btn btn-sub" onClick={() => setSheetOpen(true)}>
        {LAYOUT_LABEL[layoutId].name} 바꾸기
      </button>
      <p className="ctl-note">안내 단계: {LEVEL_NAME[level]}</p>
    </div>
  )

  return (
    <div className={`study study-${device}`}>
      <AppHeader
        back={isReview ? '#/' : href({ name: 'materials', lang: material.lang, tab: material.kind === 'starter' ? 'starter' : 'script' })}
        title={<span className="study-title">{material.title}</span>}
        right={
          <>
            <span className="study-meta">{progressText}</span>
            <button type="button" className="study-words" onClick={() => setWordsOpen(true)}>
              단어 {words.length}
            </button>
            {device === 'mobile' ? (
              <a href="#/friend" className="study-face" aria-label="친구 바꾸기">
                <FriendImage friend={settings.friend} stage={stage} size={40} />
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
            <FriendImage friend={settings.friend} stage={stage} size={168} />
            <p className="study-time">연습 시간 {minutes(activeMs)}</p>
            <a className="btn btn-sub" href="#/friend">
              친구 바꾸기
            </a>
          </aside>
          <section className="study-center">
            {prev && (
              <p className="sentence-prev" lang={htmlLang}>
                {prev.src}
              </p>
            )}
            {sentence}
            {input}
            {status}
            {guidePanel}
          </section>
          <aside className="study-controls" aria-label="조작">
            {listenGroup}
            {lineGroup}
            {keyboardGroup}
          </aside>
        </main>
      ) : (
        <main className="study-mobile">
          {sentence}
          {input}
          {status}
          {guidePanel}
          <div className="ctl-row ctl-mobile">
            <button type="button" className="btn btn-sub" onClick={() => void listen()}>
              ▶ 듣기
            </button>
            <button type="button" className="btn btn-sub" disabled={idx === 0} onClick={() => goTo(idx - 1)}>
              이전 줄
            </button>
            <button type="button" className="btn btn-sub" onClick={() => goTo(idx + 1)}>
              건너뛰기
            </button>
            <button type="button" className="btn btn-sub" aria-pressed={lineSaved} onClick={() => void toggleWord(line.src, undefined, true)}>
              {lineSaved ? '✓ 담음' : '줄 담기'}
            </button>
          </div>
          {voiceNote && <p className="ctl-note">{voiceNote}</p>}
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
