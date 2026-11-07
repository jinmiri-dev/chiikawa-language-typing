import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type CompositionEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, FriendBubble, FriendImage, StatusNotice, Sentences } from '../../components/components'
import KeyboardMap from '../../components/KeyboardMap'
import { pickLine, STAGE_LINES, type FriendLine, type Situation } from '../../content/friendLines'
import { clockEvent, stageOf, type ClockState } from '../../engine/friend/clock'
import { nextHintLevel, type HintLevel, type HintMemory } from '../../engine/hint/hint'
import { keyboardTrouble, layoutFromComposition, TROUBLE_TEXT } from '../../engine/detect'
import { explainMistake } from '../../engine/judge/explain'
import { composingAhead, judge, significantChars } from '../../engine/judge/judge'
import { DEFAULT_LAYOUT, getLayout, LAYOUT_LABEL, layoutsFor, mnPcChar } from '../../engine/layouts'
import { LANG_NAME } from '../../engine/lang'
import { guideByKeys, guideFor, guideText, keyIdOfCode, remainingSeg, stepSpeech } from '../../engine/layouts/guide'
import { newReviewItem, reviewId, schedule } from '../../engine/review/schedule'
import { avgLineMs } from '../../engine/stats/compare'
import { dayKey } from '../../engine/stats/trend'
import type { LayoutId, LineResult, Material, Progress, Segment, Word } from '../../engine/types'
import { sentenceGroups } from '../../engine/text'
import { getMaterial } from '../../services/materials'
import YouTubePlayer, { type PlayerHandle } from '../../components/YouTubePlayer'
import { getGloss, workerOrigin, type WordPair } from '../../services/api'
import { currentPair, koRange, placePairs } from '../../engine/pairs'
import { speak, stopSpeaking } from '../../services/speech'
import { syncStep } from '../../services/youtubeSync'
import { playSfx } from '../../services/sfx'
import { getMaterialBest, ghostProgress, saveRun, type MaterialBest } from '../../services/records'
import { perMinute, sessionStats } from '../../engine/stats/speed'
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

/** 휴대폰 키보드가 올라오면 보이는 높이를 --vvh 에 넣고, 화면이 크게 줄었는지(키보드가 올라왔는지) 알려 준다 */
function useVisualViewport(): boolean {
  const [shrunk, setShrunk] = useState(false)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    let tallest = vv.height
    const set = () => {
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`)
      tallest = Math.max(tallest, vv.height)
      setShrunk(vv.height < tallest - 150)
    }
    set()
    vv.addEventListener('resize', set)
    return () => vv.removeEventListener('resize', set)
  }, [])
  return shrunk
}

/** 키 안내 한 줄: '→' 로 나눈 덩어리(예: Z A O S H A N G)는 가운데서 줄이 바뀌지 않게 묶는다 */
function GuideParts({ text }: { text: string }) {
  return (
    <>
      {text.split(' → ').map((p, i) => (
        <span key={i}>
          {i > 0 && ' '}
          <span className="guide-part">
            {i > 0 && '→ '}
            {p}
          </span>
        </span>
      ))}
    </>
  )
}

/** 키보드에 없어 칠 수 없는 글자 */
const SKIP_CHARS: Partial<Record<LayoutId, RegExp>> = { 'mn-cyrillic': /[!]/ }

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

function minutesSeconds(ms: number) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
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
  if (loaded === undefined)
    return (
      <main className="app">
        <section className="center">
          <p className="busy" aria-live="polite">
            연습을 준비하고 있어요. 처음 여는 레슨은 읽기(후리가나·병음)를 만드느라 몇 초 걸려요.
          </p>
        </section>
      </main>
    )
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
  const viewportShrunk = useVisualViewport()
  const reduceMotion = settings.reduceMotion || (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches)

  // 다 친 재료를 다시 열면 처음부터, 지난 회차 평균은 비교용으로 남긴다
  const restart = !!initial && initial.lineIndex >= material.lines.length
  const prevAvgMs = restart && initial!.results.length ? initial!.results.reduce((a, r) => a + r.ms, 0) / initial!.results.length : initial?.prevAvgMs
  const [idx, setIdx] = useState(restart ? 0 : (initial?.lineIndex ?? 0))
  const [results, setResults] = useState<LineResult[]>(restart ? [] : (initial?.results ?? []))
  const [value, setValue] = useState('')
  const [committed, setCommitted] = useState('')
  const [composing, setComposing] = useState('')
  /** 줄마다 낱말 짝(원문 낱말 ↔ 한국어 뜻). 중계 서버가 만들어 두고, 이 화면은 앞 몇 줄을 미리 받아 둔다 */
  const [pairs, setPairs] = useState<Record<string, WordPair[]>>({})
  const asked = useRef(new Set<string>())
  /** 입력기로 조합하는 동안 실제로 누른 키 자리(입력기가 글자를 어떻게 보여 주든 사람이 친 순서) */
  const [pressed, setPressed] = useState<string[]>([])
  const [lineDone, setLineDone] = useState(false)
  const [videoSaved, setVideoSaved] = useState(false)
  // 영상과 줄 시간 맞추기(가사 저장소 가사는 뮤직비디오와 조금 어긋날 수 있다). 재료에 저장해 다음에도 쓴다
  const [offset, setOffset] = useState(material.timeOffset ?? 0)
  function nudge(by: number) {
    const next = Math.round((offset + by) * 10) / 10
    setOffset(next)
    void store.saveMaterial({ ...material, timeOffset: next })
  }
  useEffect(() => {
    if (material.youtubeId) void store.listSaved(material.lang).then((list) => setVideoSaved(list.some((v) => v.videoId === material.youtubeId)))
  }, [store, material])
  /** 자동으로 넘어갈 때 그 사이 다른 줄로 옮겼는지 보려고 */
  const idxRef = useRef(idx)
  idxRef.current = idx
  const [hintMem, setHintMem] = useState<HintMemory>({})
  const [lastInputAt, setLastInputAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  /** 틀리지 않고 이어서 맞힌 줄 수(콤보) */
  const [combo, setCombo] = useState(0)
  /** 경주 상대: 같은 재료를 가장 빨리 쳤던 지난 기록 */
  const [ghost, setGhost] = useState<MaterialBest | null>(null)
  useEffect(() => {
    void getMaterialBest(store, material.id).then((b) => setGhost(b && b.lineMs.length === material.lines.length ? b : null))
  }, [store, material])
  /** 문장 목록(누르면 그 문장을 읽어 준다) */
  const [listOpen, setListOpen] = useState(false)
  const [bubble, setBubble] = useState<{ line: FriendLine | null; at: number }>({ line: null, at: 0 })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  /** 키보드 자동 인식 알림(바꿨어요 / 이 키보드가 아닌 것 같아요) */
  const [kbNote, setKbNote] = useState('')
  // 휴대폰도 처음부터 자판 그림을 펼쳐 둔다(무엇을 누를지 바로 보이게). 접을 수 있다
  const [mobileMap, setMobileMap] = useState(true)
  /** 입력칸에 손가락이 들어가 있으면(휴대폰 키보드가 올라와 있으면) 자판 그림을 숨기고 안내 줄만 */
  const [inputFocused, setInputFocused] = useState(false)
  /** 자동 포커스만으로는 키보드가 안 올라오므로, 직접 눌렀거나 화면이 줄었을 때만 올라온 것으로 본다 */
  const [inputTapped, setInputTapped] = useState(false)
  const kbUp = device === 'mobile' && inputFocused && (inputTapped || viewportShrunk)
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
  useEffect(() => {
    if (settings.show.pairs === false) return
    const want = material.lines.slice(idx, idx + 5).filter((l) => l.ko && !asked.current.has(l.id))
    if (!want.length) return
    want.forEach((l) => asked.current.add(l.id))
    void getGloss(
      material.lang,
      want.map((l) => ({ src: l.src, ko: l.ko! })),
    ).then((got) => setPairs((p) => ({ ...p, ...Object.fromEntries(want.map((l, i) => [l.id, got[i]])) })))
  }, [idx, material, settings.show.pairs])

  const lang = material.lang
  const htmlLang = LANG_NAME[lang].htmlLang
  const saved = settings.layout[lang]
  const layoutId: LayoutId = saved && getLayout(saved).lang === lang && getLayout(saved).device === device ? saved : DEFAULT_LAYOUT[lang][device]
  const layout = getLayout(layoutId)
  // 채점: 기본은 띄어쓰기·문장부호까지. 그 키보드로 칠 수 없는 글자(몽골어 키릴 PC 의 !)는 건너뛴다
  const strict = !settings.easyGrading
  const skip = SKIP_CHARS[layoutId]
  const recorder = useMemo(() => lineRecorder(line.src, strict, skip), [line, strict, skip])

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

  // 처음 들어왔을 때 인사(복습이면 복습 인사). 키보드는 치기 시작하면 알아서 맞추므로 고르기 창을 먼저 띄우지 않는다
  useEffect(() => {
    say(isReview ? 'review' : 'hello')
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
      await player.current.playSegment(line.start + offset, (line.end ?? line.start + 5) + offset, settings.rate)
      return
    }
    const r = await speak(line.src, { lang: material.lang, voice: settings.voice[material.lang] ?? 'female', rate: settings.rate })
    setVoiceNote(
      r.source === 'none'
        ? // 크롬·삼성 인터넷에는 몽골어 등 목소리가 없는 경우가 많다. PC 의 Edge 는 무료 온라인 목소리를 갖고 있다
          `이 브라우저에는 ${LANG_NAME[material.lang].ko} 목소리가 없어요. PC의 Microsoft Edge로 열면 ${LANG_NAME[material.lang].ko} 목소리로 들을 수 있어요.`
        : r.source === 'device' && workerOrigin()
          ? '기기 목소리로 읽고 있어요.'
          : '',
    )
  }, [line, material, settings.voice, settings.rate, offset])

  // 유튜브 재료: 영상이 지금 줄 끝을 지나면 멈추고, 진행 막대를 끌어 다른 줄로 가면 그 줄로(함께 가기)
  const lastVideoT = useRef(0)
  const onVideoTime = (t: number) => {
    const prevT = lastVideoT.current
    lastVideoT.current = t
    const step = syncStep(material.lines, idxRef.current, prevT - offset, t - offset)
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
    stopSpeaking()
    // 줄 시작 때 자동으로 듣기: 설정, 또는 유튜브 재료는 기본으로(기획안 10장)
    if (settings.autoListen || material.kind === 'youtube') void listen()
    inputRef.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx])

  const res = judge(line.src, committed, { strict, skip })
  const starts = segmentStarts(line.segments)
  const segIndex = res.done ? -1 : Math.max(0, starts.findLastIndex((s) => s <= res.okUpTo))
  const seg = segIndex >= 0 ? line.segments[segIndex] : null
  const strip = (s: string) => significantChars(s, strict, skip).join('')
  const mistake = res.wrongAt !== undefined ? explainMistake(lang, strip(line.src), strip(committed)) : null

  // 지금 칠 조각의 안내
  const inSeg = seg ? res.okUpTo - starts[segIndex] : 0
  // 문장 강조는 조합 중인 가나도 따라간다(확정 전에도 어디까지 쳤는지 보이게)
  const shownUpTo = res.wrongAt === undefined ? res.okUpTo + composingAhead(line.src, res.okUpTo, composing) : res.okUpTo
  const placed = settings.show.pairs === false ? [] : placePairs(line.src, pairs[line.id] ?? [])
  const pair = res.done ? null : currentPair(placed, res.okUpTo)
  const pairKo = pair && line.ko ? koRange(line.ko, pair.ko) : null
  const segComposing = seg && seg.text === seg.reading ? seg.text.slice(0, inSeg) + composing : composing
  const guideSeg = seg && seg.text !== seg.reading ? remainingSeg(seg, [...seg.text.slice(0, inSeg)].length) : seg
  const baseGuide = guideSeg && guideSeg.confident && layout.verified ? guideFor(layout, guideSeg, segComposing) : null
  // PC 병음·주음은 키가 하나로 정해져 있어, 누른 키 자리로 따라가는 쪽이 입력기 표시보다 정확하다
  const byKeys = baseGuide && device === 'pc' && (lang === 'zh' || lang === 'tw') && composing && pressed.length ? guideByKeys(baseGuide.steps, pressed) : null
  const guide = baseGuide && byKeys ? { ...baseGuide, ...byKeys } : baseGuide
  const nextStep = guide?.steps[guide.nextIndex]

  const idle = now - lastInputAt >= 2000
  const fading = seg ? (hintMem[seg.reading ?? seg.text]?.level ?? 'full') : 'full'
  const level: HintLevel = !settings.hintFading ? settings.hintMode : idle || mistake ? 'full' : fading

  /** 단어(또는 줄 전체)를 담고, 그 줄을 복습에 넣는다. 다시 누르면 뺀다. */
  async function toggleWord(text: string, reading: string | undefined, wholeLine: boolean, meaning?: string) {
    const id = wholeLine ? `${material.id}|${line.id}` : `${material.lang}:${text}`
    const exists = words.find((w) => w.id === id)
    if (exists) {
      await store.deleteWord(id)
      setWords((ws) => ws.filter((w) => w.id !== id))
    } else {
      const w: Word = {
        id, lang: material.lang, text, ...(reading && reading !== text ? { reading } : {}),
        // 낱말 짝에서 뜻을 찾아 함께 담는다(단어 복습의 뜻 고르기에 쓴다)
        ...(() => {
          const m = meaning ?? (wholeLine ? undefined : placed.find((p) => p.src === text || p.src.includes(text) || text.includes(p.src))?.ko)
          return m ? { meaning: m } : {}
        })(),
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

  const charsOf = useMemo(() => Object.fromEntries(material.lines.map((l) => [l.id, significantChars(l.src, strict, skip).length])), [material, strict, skip])
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
      // 노래는 흐름이 끊기지 않게 Enter 없이 다음 소절로 넘어간다(그 사이 Esc 로 다시 들을 수 있다)
      const song = !!material.youtubeId && material.source === 'lyrics'
      if (!settings.autoAdvance && !song) return
      await new Promise((r) => setTimeout(r, song ? 400 : settings.listenAfter ? 600 : 900))
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

    streak.current = r.mistakes === 0 ? streak.current + 1 : 0
    setCombo(streak.current)
    if (settings.sfx !== false) playSfx('line')
    // 마지막 줄: 이번 기록을 남기고(완료 화면·다음 경주에 쓴다) 최고 기록이면 알린다
    if (idx + 1 >= material.lines.length && material.lines.every((l) => nextResults.some((x) => x.lineId === l.id))) {
      const st = sessionStats(nextResults, charsOf)
      const lineMs = material.lines.map((l) => nextResults.find((x) => x.lineId === l.id)!.ms)
      void saveRun(store, material.lang, material.id, { cpm: st.cpm, accuracy: st.accuracy, lineMs, at: t }).then(async (rec) => {
        await store.setMeta('lastRun', { materialId: material.id, cpm: st.cpm, accuracy: st.accuracy, at: t, ...rec })
        if (rec.materialRecord && rec.prevMaterial && settings.sfx !== false) playSfx('record')
      })
    }

    // 친구 반응: 5분 단계가 바뀌었으면 그것만, 아니면 연속·다시 맞힘·가끔 한마디
    const stage = stageOf(clock.current.activeMs)
    if (stage > shownStage.current) {
      shownStage.current = stage
      const s = STAGE_LINES[settings.friend][stage]
      say(stage === 6 ? 'rest' : stage === 12 ? 'sixty' : 'step', { text: s.line, action: s.pose })
      return
    }
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
    const r = judge(line.src, v, { strict, skip })
    if (settings.sfx !== false && !r.done) {
      const before = judge(line.src, committed, { strict, skip })
      if (r.wrongAt !== undefined && before.wrongAt === undefined) playSfx('wrong')
      else if (r.wrongAt === undefined && r.okUpTo > before.okUpTo) playSfx('key')
    }

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
    autoKeyboard(e.data)
  }
  /** 입력기가 보내는 글자로 실제 자판을 알아보고 맞춘다(주음↔병음, 로마자↔플릭 등) */
  function autoKeyboard(data: string) {
    if (keyboardTrouble(lang, { key: '', composing: data }) === 'korean-ime') {
      setKbNote(TROUBLE_TEXT['korean-ime'](lang, device))
      return
    }
    const id = layoutFromComposition(lang, device, data)
    if (id && id !== layoutId && layoutsFor(lang, device).some((l) => l.id === id)) {
      setSettings({ layout: { ...settings.layout, [lang]: id } })
      setKbNote(`치는 모양을 보고 키보드를 '${LAYOUT_LABEL[id].name}'(으)로 맞췄어요.`)
    } else if (kbNote && !/맞췄어요/.test(kbNote)) setKbNote('')
  }
  const onKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing || e.key === 'Process') {
      if (e.code === 'Backspace') setPressed((p) => p.slice(0, -1))
      else {
        const id = keyIdOfCode(e.code)
        if (id) setPressed((p) => [...p, id])
      }
      return
    }
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
    // 몽골어(PC): 몽골어 자판을 깔지 않았어도(영문·러시아 자판이어도) 자판 그림 자리대로 누르면 그 몽골 글자가 들어간다
    if (lang === 'mn' && device === 'pc') {
      const id = keyIdOfCode(e.code)
      const ch = id ? mnPcChar(id, e.shiftKey) : null
      if (ch) {
        e.preventDefault()
        const el = e.currentTarget
        const from = el.selectionStart ?? el.value.length
        const to = el.selectionEnd ?? from
        const v = el.value.slice(0, from) + ch + el.value.slice(to)
        el.value = v // 아주 빠르게 이어 눌러도 다음 키가 바뀐 값을 보게
        setValue(v)
        commit(v)
        requestAnimationFrame(() => el.setSelectionRange(from + ch.length, from + ch.length))
        if (kbNote) setKbNote('')
        return
      }
    }
    const t = keyboardTrouble(lang, { key: e.key, code: e.code }, [...line.src.slice(res.okUpTo)][0])
    if (t) setKbNote(TROUBLE_TEXT[t](lang, device))
    else if (kbNote && !/맞췄어요/.test(kbNote)) setKbNote('')
  }
  const onCompositionEnd = (e: CompositionEvent<HTMLInputElement>) => {
    composingRef.current = false
    setComposing('')
    setPressed([])
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

  // 단축키(PC): Enter 다음 줄, Esc 다시 듣기(입력기 조합 중이면 조합 취소로 둔다), Ctrl+←/→ 이전·다음 줄
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing) return
      if (e.key === 'Enter' && lineDone) {
        e.preventDefault()
        goTo(idx + 1)
      } else if (e.key === 'Escape' && !sheetOpen && !wordsOpen) {
        e.preventDefault()
        void listen()
      } else if (e.ctrlKey && e.key === 'ArrowLeft') goTo(idx - 1)
      else if (e.ctrlKey && e.key === 'ArrowRight') goTo(idx + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lineDone, idx, goTo, listen, sheetOpen, wordsOpen])

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
      const state = res.done || at < res.okUpTo ? 'done' : at === res.wrongAt ? 'wrong' : at < shownUpTo ? 'typing' : at === shownUpTo ? 'now' : 'rest'
      return (
        <span key={ci} className={`ch ch-${state}`} data-wrong={state === 'wrong' || undefined} data-pair={(pair && at >= pair.start && at < pair.end) || undefined}>
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
          {pairKo ? (
            <>
              {line.ko.slice(0, pairKo[0])}
              <mark className="ko-pair">{line.ko.slice(pairKo[0], pairKo[1])}</mark>
              {line.ko.slice(pairKo[1])}
            </>
          ) : (
            <Sentences text={line.ko} />
          )}
        </p>
      )}
      {pair && settings.show.src && (
        <p className="pair-chip">
          <b lang={htmlLang}>{pair.src}</b>
          <span aria-hidden="true">=</span>
          <span lang="ko">{pair.ko}</span>
          <button type="button" className="pair-save" aria-pressed={savedText.has(pair.src)} onClick={() => void toggleWord(pair.src, line.segments.find((g) => g.text === pair.src)?.reading, false, pair.ko)}>
            {savedText.has(pair.src) ? '★ 담음' : '☆ 담기'}
          </button>
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
        onKeyDown={onKeyDown}
        onFocus={(e) => {
          setInputFocused(true)
          const el = e.currentTarget
          // 휴대폰 키보드가 다 올라온 뒤 입력칸을 보이는 화면 맨 아래에 맞춘다(그 위로 안내 줄·문장이 보이게)
          setTimeout(() => el.scrollIntoView?.({ block: device === 'mobile' ? 'end' : 'nearest' }), device === 'mobile' ? 350 : 0)
        }}
        onBlur={() => {
          setInputFocused(false)
          setInputTapped(false)
        }}
        onPointerDown={() => setInputTapped(true)}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="next"
        readOnly={lineDone}
      />
      {device === 'mobile' && kbUp && (
        <button type="button" className="btn btn-sub listen-btn" aria-label="다시 듣기" onMouseDown={(e) => e.preventDefault()} onClick={() => void listen()}>
          ▶
        </button>
      )}
      {device === 'mobile' && !kbUp && (
        <button type="button" className="btn btn-sub layout-btn" onClick={() => setSheetOpen(true)}>
          {LAYOUT_LABEL[layoutId].name} ▾
        </button>
      )}
    </div>
  )

  const kbNotice = kbNote ? (
    <p className="kb-note" role="status">
      <span className="kb-note-text">
        <Sentences text={kbNote} />
      </span>
      <button type="button" className="kb-note-x" aria-label="알림 닫기" onClick={() => setKbNote('')}>
        ×
      </button>
    </p>
  ) : null

  // 계기판: 시간·속도(자/분)·정확도·콤보, 친구가 달리는 진행 막대
  const stats = sessionStats(results, charsOf)
  const startedAt = recorder.startedAt
  const liveCpm = !lineDone && startedAt && res.okUpTo > 0 ? perMinute(significantChars(line.src.slice(0, res.okUpTo), strict, skip).length, Math.max(1000, now - startedAt)) : null
  // 지난 나: 이번에 친 줄들의 시간 + 지금 줄에서 흐른 시간만큼 지난 기록이 어디까지 갔는지
  const elapsed = results.reduce((a, r) => a + r.ms, 0) + (!lineDone && startedAt ? now - startedAt : 0)
  const ghostLeft = ghost && elapsed > 0 ? (Math.min(ghostProgress(ghost.lineMs, elapsed), material.lines.length) / material.lines.length) * 100 : null
  const myLeft = (Math.min(idx + (lineDone ? 1 : Math.min(1, res.okUpTo / Math.max(1, line.src.length))), material.lines.length) / material.lines.length) * 100
  const hud = (
    <div className="study-hud" role="group" aria-label="기록">
      <div className="hud-stats">
        <span className="hud-stat">
          <small>시간</small>
          <b>{minutesSeconds(activeMs)}</b>
        </span>
        <span className="hud-stat" title="1분에 치는 글자 수(띄어쓰기·문장부호 포함)">
          <small>속도</small>
          <b>
            {liveCpm ?? stats.cpm}
            <em>자/분</em>
          </b>
        </span>
        <span className="hud-stat">
          <small>정확도</small>
          <b>
            {stats.accuracy}
            <em>%</em>
          </b>
        </span>
        <span className="hud-stat" data-hot={combo >= 3 || undefined}>
          <small>콤보</small>
          <b>{combo > 0 ? `🔥 ${combo}` : '-'}</b>
        </span>
        <button
          type="button"
          className="hud-sound"
          aria-pressed={settings.sfx !== false}
          aria-label={settings.sfx !== false ? '효과음 끄기' : '효과음 켜기'}
          onClick={() => setSettings({ sfx: settings.sfx === false })}
        >
          {settings.sfx !== false ? '🔊' : '🔇'}
        </button>
      </div>
      <div className="hud-track" aria-hidden="true">
        <span className="hud-fill" style={{ width: `${myLeft}%` }} />
        {ghostLeft !== null && (
          <span className="hud-ghost" style={{ left: `${ghostLeft}%` }} title="지난 내 최고 기록">
            <FriendImage friend={settings.friend} stage={stage} size={22} />
          </span>
        )}
        <span className="hud-runner" style={{ left: `${myLeft}%` }}>
          <FriendImage friend={settings.friend} stage={stage} size={28} />
        </span>
      </div>
      {ghost && (
        <p className="hud-race" data-ahead={(ghostLeft !== null && myLeft >= ghostLeft) || undefined}>
          {ghostLeft === null ? `흐린 친구는 지난 나(${ghost.cpm}자/분)예요. 이겨 봐요!` : myLeft >= ghostLeft ? '지난 나보다 앞서는 중!' : '지난 나를 따라잡아 봐요'}
        </p>
      )}
    </div>
  )

  /** 문장 하나 듣기: 영상이면 그 구간, 아니면 목소리 */
  function sayLine(l: (typeof material.lines)[number]) {
    if (material.youtubeId && l.start !== undefined && player.current) void player.current.playSegment(l.start + offset, (l.end ?? l.start + 5) + offset, settings.rate)
    else void speak(l.src, { lang: material.lang, voice: settings.voice[material.lang] ?? 'female', rate: settings.rate })
  }
  const lineList = listOpen ? (
    <section className="line-list" aria-label="문장 목록">
      <ol>
        {material.lines.map((l, i) => (
          <li key={l.id} data-current={i === idx || undefined}>
            <button type="button" className="line-say" onClick={() => sayLine(l)} aria-label={`${i + 1}번 문장 듣기`}>
              ▶
            </button>
            <button type="button" className="line-text" onClick={() => sayLine(l)}>
              <span lang={htmlLang}>{l.src}</span>
              {l.ko && <small lang="ko">{l.ko}</small>}
            </button>
            <button type="button" className="btn btn-sub line-go" onClick={() => goTo(i)} disabled={i === idx}>
              {i === idx ? '지금' : '이 줄 치기'}
            </button>
          </li>
        ))}
      </ol>
    </section>
  ) : null

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

  // 키 안내 한 줄(무엇을 누를지)과 자판 그림을 나눠 둔다: 휴대폰은 안내 줄을 입력칸 바로 위에, 그림은 키보드를 내렸을 때만
  const guideLine = !seg ? null : !seg.confident ? (
    <StatusNotice title="읽기를 확인하지 못한 줄이에요">
      {(material.kind === 'script' ? '대본 정리 화면에서 읽기를 고치면 키 안내가 나와요. ' : '') + '타자와 채점은 그대로 돼요.'}
    </StatusNotice>
  ) : !layout.verified ? (
    // 키 자리를 아직 확인하지 못한 자판: 그림 대신 무엇을 칠지(읽기·입력 순서)를 글로 알려 준다
    <div className="guide">
      <p className="guide-line" lang={htmlLang}>
        <GuideParts text={guideText(layout, guideSeg ?? seg)} />
      </p>
      {!kbUp && <p className="guide-note">자판 그림은 기기마다 달라 아직 준비 중이에요. 위 순서대로 쳐 보세요.</p>}
    </div>
  ) : (
    <div className="guide">
      {level !== 'off' ? (
        <p className="guide-line" lang={htmlLang}>
          {device === 'mobile' && <span className="guide-tag">누를 키</span>}
          <GuideParts text={guideText(layout, guideSeg ?? seg)} />
        </p>
      ) : (
        <p className="guide-off"><Sentences text="안내 없이 쳐 봐요. 멈추면 다시 알려 줘요." /></p>
      )}
      <p className="sr-only" aria-live="polite">
        {level !== 'off' ? stepSpeech(layout, nextStep) : ''}
      </p>
    </div>
  )
  const showMap = !!seg && seg.confident && layout.verified && level === 'full'
  const guideMap = !showMap ? null : (
    <div className="guide guide-map">
      {lang === 'mn' && device === 'pc' && (
        <p className="guide-note">
          <Sentences text="몽골어 자판을 깔지 않아도 돼요. 영문 상태에서 그림의 자리대로 누르면 몽골 글자가 들어가요(예: B → м)." />
        </p>
      )}
      {(device === 'pc' || (mobileMap && !kbUp)) && <KeyboardMap layout={layout} next={nextStep} then={guide?.steps[(guide?.nextIndex ?? 0) + 1]} small={device === 'mobile'} />}
      {device === 'mobile' && !kbUp && (
        <button type="button" className="btn btn-sub map-toggle" onClick={() => setMobileMap((v) => !v)} aria-expanded={mobileMap}>
          {mobileMap ? '자판 그림 접기' : '자판 그림 보기'}
        </button>
      )}
    </div>
  )
  const guidePanel = (
    <>
      {guideLine}
      {guideMap}
    </>
  )

  // 조작은 한곳에: 입력칸 바로 아래 한 줄(PC). 키보드가 하나뿐이면 바꾸기 버튼은 두지 않는다
  const canChangeKeyboard = layoutsFor(lang, device).length > 1
  const toolbar = (
    <div className="study-toolbar" role="group" aria-label="조작">
      <div className="tb-group">
        <button type="button" className="btn btn-sub" onClick={() => void listen()}>
          ▶ 다시 듣기 <span className="key-hint">Esc</span>
        </button>
        {material.lines.length > 1 && (
          <button type="button" className="btn btn-sub" aria-pressed={listOpen} onClick={() => setListOpen((o) => !o)}>
            {listOpen ? '문장 목록 닫기' : `문장 목록 · 골라 듣기`}
          </button>
        )}
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
      {material.youtubeId && material.source === 'lyrics' && (
        <div className="tb-group tb-sync" role="group" aria-label="가사 시간 맞추기">
          <span className="tb-note">가사 시간</span>
          <button type="button" className="btn btn-sub" onClick={() => nudge(-0.5)} title="가사가 소리보다 늦게 나오면">
            0.5초 앞으로
          </button>
          <button type="button" className="btn btn-sub" onClick={() => nudge(0.5)} title="가사가 소리보다 먼저 나오면">
            0.5초 뒤로
          </button>
          {offset !== 0 && <span className="tb-note">{offset > 0 ? `+${offset}` : offset}초</span>}
        </div>
      )}
      {material.link && (
        <div className="tb-group">
          <a className="btn btn-sub" href={material.link} target="_blank" rel="noopener noreferrer">
            원문 기사{material.sourceName ? ` · ${material.sourceName}` : ''} ↗
          </a>
        </div>
      )}
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
            <span className="study-bar" aria-hidden="true">
              <span style={{ width: `${(Math.min(idx, material.lines.length) / material.lines.length) * 100}%` }} />
            </span>
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
        // PC: 왼쪽에 (영상)·조작·친구, 오른쪽에 문장·입력·자판을 모아 스크롤 없이 한 화면에 다 보이게
        <main className={`study-grid study-grid-video${material.youtubeId ? ' has-video' : ''}`}>
          <aside className="study-side" aria-label={material.youtubeId ? '영상과 조작' : '조작과 친구'}>
            {material.youtubeId && <YouTubePlayer ref={player} videoId={material.youtubeId} title={material.title} onTime={onVideoTime} />}
            {toolbar}
            {lineList}
            <div className="study-friend study-friend-row">
              <FriendImage friend={settings.friend} stage={stage} size={material.youtubeId ? 88 : 140} cue={bubble.at} />
              <div className="study-friend-text">
                <FriendBubble line={bubble.line} shownAt={bubble.at} />
                <p className="study-time">연습 시간 {minutes(activeMs)}</p>
                <a className="btn btn-sub" href="#/friend">
                  친구 바꾸기
                </a>
              </div>
            </div>
          </aside>
          <section className="study-center">
            {hud}
            {prev && (
              <p className="sentence-prev" lang={htmlLang}>
                {prev.src}
              </p>
            )}
            {sentence}
            {input}
            {kbNotice}
            {status}
            {guidePanel}
          </section>
        </main>
      ) : (
        <main className={`study-mobile${kbUp ? ' kb-up' : ''}`}>
          {hud}
          {material.youtubeId && <YouTubePlayer ref={player} videoId={material.youtubeId} title={material.title} onTime={onVideoTime} />}
          {sentence}
          {guideLine}
          {input}
          {kbNotice}
          {status}
          {guideMap}
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
            {material.lines.length > 1 && (
              <button type="button" className="btn btn-sub" aria-pressed={listOpen} onClick={() => setListOpen((o) => !o)}>
                {listOpen ? '목록 닫기' : '문장 목록'}
              </button>
            )}
          </div>
          {lineList}
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
