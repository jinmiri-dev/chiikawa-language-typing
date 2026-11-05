import { useEffect, useMemo, useRef, useState } from 'react'
import { LANGS, LANG_NAME, type Lang } from '../engine/lang'
import { DEFAULT_LAYOUT, getLayout } from '../engine/layouts'
import { guideText } from '../engine/layouts/guide'
import { loadSegmenter } from '../services/segmenter'
import { compositionLabel, createInputLogger, summarizeLog, type LoggedEvent } from './inputLog'
import { labSamples, LAB_TARGET } from './samples'
import './InputLab.css'

type Logger = ReturnType<typeof createInputLogger>

export interface LabReport {
  createdAt: string
  userAgent: string
  language: Lang
  keyboardLabel: string
  sampleId: string
  summary: ReturnType<typeof summarizeLog>
  events: LoggedEvent[]
}

function download(report: LabReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lab-${report.sampleId}-${report.createdAt.replace(/[:.]/g, '-')}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export default function InputLab() {
  const [lang, setLang] = useState<Lang>('ja')
  const samples = useMemo(() => labSamples(lang), [lang])
  const [sampleId, setSampleId] = useState(samples[0].id)
  const [keyboardLabel, setKeyboardLabel] = useState('')
  const [events, setEvents] = useState<LoggedEvent[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLParagraphElement>(null)
  const loggerRef = useRef<Logger | null>(null)

  const sample = samples.find((s) => s.id === sampleId) ?? samples[0]

  // 무엇을 칠지 모르면 칠 수 없다: 휴대폰 기본 자판으로 낱말마다 누를 순서를 보여 준다
  const [howTo, setHowTo] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    setHowTo([])
    void loadSegmenter(lang).then((segment) => {
      if (!alive) return
      const layout = getLayout(DEFAULT_LAYOUT[lang].mobile)
      setHowTo(segment(sample.text).filter((g) => g.isWord && g.confident).map((g) => guideText(layout, g)))
    }, () => {})
    return () => {
      alive = false
    }
  }, [lang, sample.text])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const logger = createInputLogger(el)
    loggerRef.current = logger
    const tick = () => setEvents(logger.events())
    const types = ['keydown', 'compositionupdate', 'compositionend', 'input']
    for (const t of types) el.addEventListener(t, tick)
    return () => {
      for (const t of types) el.removeEventListener(t, tick)
      logger.dispose()
    }
  }, [])

  const summary = summarizeLog(events, LAB_TARGET[lang])
  const matches = summary.finalValue.trim() === sample.text

  function reset() {
    loggerRef.current?.clear()
    setEvents([])
    if (inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.focus()
    }
  }

  function changeLang(next: Lang) {
    setLang(next)
    setSampleId(labSamples(next)[0].id)
    reset()
  }

  return (
    <section className="lab">
      <a className="lab-back" href="#/">
        ← 처음으로
      </a>
      <h1>입력 시험</h1>
      <p className="lab-sub">휴대폰 키보드를 고르고 예문을 그대로 쳐 보세요. 결과 파일을 보내 주시면 키보드 안내를 맞출게요.</p>

      <fieldset className="lab-langs">
        <legend>언어</legend>
        {LANGS.map((l) => (
          <button key={l} type="button" aria-pressed={l === lang} onClick={() => changeLang(l)}>
            {LANG_NAME[l].ko}
          </button>
        ))}
      </fieldset>

      <label className="lab-field">
        예문
        <select
          value={sample.id}
          onChange={(e) => {
            setSampleId(e.target.value)
            reset()
          }}
        >
          {samples.map((s) => (
            <option key={s.id} value={s.id}>
              {s.text}
            </option>
          ))}
        </select>
      </label>

      <p ref={targetRef} className="lab-target" lang={LANG_NAME[lang].htmlLang}>
        {sample.text}
      </p>
      {howTo.length > 0 && (
        <ol className="lab-howto" aria-label="이렇게 쳐요" lang={LANG_NAME[lang].htmlLang}>
          {howTo.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ol>
      )}

      <label className="lab-field">
        여기에 쳐 보세요
        <input
          ref={inputRef}
          className="lab-input"
          // 휴대폰 키보드가 올라와도 문장과 입력창이 함께 보이게 문장을 맨 위로
          onFocus={() => setTimeout(() => targetRef.current?.scrollIntoView({ block: 'start' }), 300)}
          lang={LANG_NAME[lang].htmlLang}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </label>

      <dl className="lab-summary" aria-live="polite">
        <div>
          <dt>예문과 같음</dt>
          <dd>{matches ? '✓ 같아요' : summary.finalValue ? '아직 달라요' : '-'}</dd>
        </div>
        <div>
          <dt>조합 이벤트</dt>
          <dd>{summary.compositionEvents}개</dd>
        </div>
        <div>
          <dt>입력 방식</dt>
          <dd>{compositionLabel(summary)}</dd>
        </div>
        <div>
          <dt>조합 중 샘플</dt>
          <dd lang={LANG_NAME[lang].htmlLang}>{summary.compositionSamples.join(' · ') || '없음'}</dd>
        </div>
        <div>
          <dt>보이는 화면 높이(가장 작을 때)</dt>
          <dd>{summary.minViewportHeight === null ? '-' : `${summary.minViewportHeight}px`}</dd>
        </div>
      </dl>

      <label className="lab-field">
        쓰는 키보드
        <input
          value={keyboardLabel}
          onChange={(e) => setKeyboardLabel(e.target.value)}
          placeholder="예: iPhone 일본어 12키 플릭"
        />
      </label>

      {matches && (
        <p className="lab-done" role="status">
          다 쳤어요! 결과를 내려받거나 다른 예문을 골라 보세요.
        </p>
      )}
      <p className="lab-sub">결과 파일에는 입력 기록과 브라우저 정보(기기 종류)가 들어가요. 어디에도 자동으로 보내지 않아요.</p>
      <div className="lab-actions">
        <button
          type="button"
          className="primary"
          onClick={() =>
            download({
              createdAt: new Date().toISOString(),
              userAgent: navigator.userAgent,
              language: lang,
              keyboardLabel,
              sampleId: sample.id,
              summary,
              events,
            })
          }
        >
          결과 내려받기
        </button>
        <button type="button" onClick={reset}>
          지우기
        </button>
      </div>
    </section>
  )
}
