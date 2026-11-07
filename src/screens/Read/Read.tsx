/**
 * 뉴스 듣기: 기사를 문장마다 듣고(누르면 그 문장, ▶ 전체 듣기로 처음부터 끝까지), 낱말을 누르면 뜻이 나온다.
 * 타자 연습이 아니라 듣기·읽기 화면이다. 뜻은 서버 AI → (한도가 찼으면) 기기 번역 순으로 채운다.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, Sentences } from '../../components/components'
import { LANG_NAME, type Lang } from '../../engine/lang'
import { placePairs, type PlacedPair } from '../../engine/pairs'
import type { Line, Material, Segment, Word } from '../../engine/types'
import { getGloss } from '../../services/api'
import { getMaterial } from '../../services/materials'
import { speak, stopSpeaking } from '../../services/speech'
import { toKorean } from '../../services/translate'
import './Read.css'

const HAN = /\p{Script=Han}/u

/** 한자 위에 읽기(일본어 후리가나·중국어 병음). 읽기 끄기면 글자만 */
function SegText({ s, lang, ruby }: { s: Segment; lang: Lang; ruby: boolean }) {
  const show = ruby && s.reading && s.reading !== s.text && HAN.test(s.text) && lang !== 'mn' && lang !== 'en'
  return show ? (
    <ruby>
      {s.text}
      <rt>{s.reading}</rt>
    </ruby>
  ) : (
    <>{s.text}</>
  )
}

interface Picked {
  line: number
  seg: number
  text: string
  reading?: string
  meaning?: string | null
}

export default function Read({ materialId }: { materialId: string }) {
  const { store, settings, setSettings } = useApp()
  const [m, setM] = useState<Material | null | undefined>(undefined)
  const [playing, setPlaying] = useState<number | null>(null)
  const [showKo, setShowKo] = useState(true)
  const [ruby, setRuby] = useState(true)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [deviceKo, setDeviceKo] = useState(false)
  const stopRef = useRef(false)
  const pairs = useRef(new Map<number, Promise<PlacedPair[]>>())

  useEffect(() => {
    void getMaterial(store, materialId).then(setM)
    void store.listWords().then((ws) => setSaved(new Set(ws.map((w) => w.id))))
    return () => {
      stopRef.current = true
      stopSpeaking()
    }
  }, [store, materialId])

  // 한국어 뜻이 빠진 문장은 기기 번역으로 채워 둔다(서버 AI 한도가 찼을 때).
  // 크롬은 처음 한 번 사용자가 눌러야 번역기를 받으므로, 낱말을 누른 뒤에도 다시 해 본다.
  const filling = useRef(false)
  const fillMissing = useCallback(async (cur: Material) => {
    if (filling.current || cur.lines.every((l) => l.ko)) return
    filling.current = true
    try {
      const lines = [...cur.lines]
      let changed = false
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].ko) continue
        const ko = await toKorean(cur.lang, lines[i].src)
        if (!ko) break
        lines[i] = { ...lines[i], ko }
        changed = true
        setM((x) => (x && x.id === cur.id ? { ...x, lines: [...lines] } : x))
      }
      if (changed) {
        setDeviceKo(true)
        await store.saveMaterial({ ...cur, lines })
      }
    } finally {
      filling.current = false
    }
  }, [store])
  useEffect(() => {
    if (m) void fillMissing(m)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m?.id])

  if (m === undefined) return null
  if (!m)
    return (
      <main className="app">
        <section className="center">
          <h1>기사를 찾지 못했어요</h1>
          <a className="link" href="#/">
            처음으로
          </a>
        </section>
      </main>
    )
  const mat = m
  const htmlLang = LANG_NAME[mat.lang].htmlLang
  const voice = { lang: mat.lang, voice: settings.voice[mat.lang] ?? ('female' as const), rate: settings.rate }

  async function playFrom(i: number) {
    stopRef.current = false
    for (let k = i; k < mat.lines.length; k++) {
      if (stopRef.current) break
      setPlaying(k)
      document.getElementById(`read-line-${k}`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
      await speak(mat.lines[k].src, voice)
      if (stopRef.current) break
      await new Promise((r) => setTimeout(r, 350))
    }
    if (!stopRef.current) setPlaying(null)
  }
  function playOne(i: number) {
    stopRef.current = true
    stopSpeaking()
    stopRef.current = false
    setPlaying(i)
    void speak(mat.lines[i].src, voice).then(() => setPlaying((p) => (p === i ? null : p)))
  }
  function stop() {
    stopRef.current = true
    stopSpeaking()
    setPlaying(null)
  }

  /** 줄의 낱말 짝(서버 AI). 한 번만 묻는다 */
  function pairsOf(i: number, line: Line): Promise<PlacedPair[]> {
    let p = pairs.current.get(i)
    if (!p) {
      p = line.ko ? getGloss(mat.lang, [{ src: line.src, ko: line.ko }]).then((r) => placePairs(line.src, r[0] ?? [])).catch(() => []) : Promise.resolve([])
      pairs.current.set(i, p)
    }
    return p
  }

  async function pick(i: number, si: number) {
    const line = mat.lines[i]
    const s = line.segments[si]
    const start = line.segments.slice(0, si).reduce((n, x) => n + x.text.length, 0)
    const base: Picked = { line: i, seg: si, text: s.text, ...(s.reading && s.reading !== s.text ? { reading: s.reading } : {}) }
    setPicked({ ...base, meaning: undefined })
    const placed = await pairsOf(i, line)
    const hit = placed.find((p) => start >= p.start && start < p.end)
    const meaning = hit?.ko ?? (await toKorean(mat.lang, hit?.src ?? s.text))
    setPicked((cur) => (cur && cur.line === i && cur.seg === si ? { ...base, ...(hit ? { text: hit.src } : {}), meaning: meaning ?? null } : cur))
    if (meaning && !hit) void fillMissing(mat)
  }

  async function saveWord(p: Picked) {
    const id = `${mat.lang}:${p.text}`
    const line = mat.lines[p.line]
    if (saved.has(id)) {
      await store.deleteWord(id)
      setSaved((s) => new Set([...s].filter((x) => x !== id)))
      return
    }
    const w: Word = {
      id,
      lang: mat.lang,
      text: p.text,
      ...(p.reading ? { reading: p.reading } : {}),
      ...(p.meaning ? { meaning: p.meaning } : {}),
      from: { materialId: mat.id, lineId: line.id },
      savedAt: Date.now(),
      example: { src: line.src, ...(line.ko ? { ko: line.ko } : {}), segments: line.segments },
    }
    await store.saveWord(w)
    setSaved((s) => new Set([...s, id]))
  }

  const pickedId = picked ? `${mat.lang}:${picked.text}` : ''
  return (
    <div className="page read-page">
      <AppHeader back={href({ name: 'materials', lang: mat.lang, tab: 'news' })} title={<span className="logo-sub">뉴스 듣기</span>} />
      <main className="read">
        <header className="read-head">
          <p className="read-source">
            {LANG_NAME[mat.lang].ko} 뉴스{mat.sourceName ? ` · ${mat.sourceName}` : ''}
            {mat.link && (
              <>
                {' · '}
                <a href={mat.link} target="_blank" rel="noopener noreferrer">
                  원문 기사 ↗
                </a>
              </>
            )}
          </p>
          <div className="read-controls" role="group" aria-label="듣기 조작">
            {playing === null ? (
              <button type="button" className="btn btn-primary" onClick={() => void playFrom(0)}>
                ▶ 처음부터 듣기
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={stop}>
                ■ 멈추기
              </button>
            )}
            <button type="button" className="btn btn-sub" aria-pressed={settings.rate === 0.75} onClick={() => setSettings({ rate: settings.rate === 1 ? 0.75 : 1 })}>
              {settings.rate === 0.75 ? '✓ 0.75배' : '0.75배'}
            </button>
            <button type="button" className="btn btn-sub" aria-pressed={showKo} onClick={() => setShowKo((v) => !v)}>
              {showKo ? '뜻 가리기' : '뜻 보기'}
            </button>
            {(mat.lang === 'ja' || mat.lang === 'zh' || mat.lang === 'tw') && (
              <button type="button" className="btn btn-sub" aria-pressed={ruby} onClick={() => setRuby((v) => !v)}>
                {ruby ? '읽기 가리기' : '읽기 보기'}
              </button>
            )}
          </div>
          <p className="read-tip">
            <Sentences text="문장을 누르면 그 문장을 들려주고, 낱말을 누르면 뜻이 나와요. 뜻을 가리고 먼저 들어 본 뒤 확인해 보세요." />
          </p>
        </header>
        <ol className="read-lines">
          {mat.lines.map((l, i) => (
            <li key={l.id} id={`read-line-${i}`} className="read-line" data-playing={playing === i || undefined} data-title={i === 0 || undefined}>
              <button type="button" className="read-play" aria-label={`${i + 1}번째 문장 듣기`} onClick={() => playOne(i)}>
                {playing === i ? '🔊' : '▶'}
              </button>
              <div className="read-body">
                <p className="read-src" lang={htmlLang}>
                  {l.segments.map((s, si) =>
                    s.isWord ? (
                      <button
                        key={si}
                        type="button"
                        className="read-word"
                        data-picked={(picked?.line === i && picked.seg === si) || undefined}
                        onClick={() => void pick(i, si)}
                      >
                        <SegText s={s} lang={mat.lang} ruby={ruby} />
                      </button>
                    ) : (
                      <span key={si}>
                        <SegText s={s} lang={mat.lang} ruby={ruby} />
                      </span>
                    ),
                  )}
                </p>
                {showKo && <p className="read-ko">{l.ko ?? '한국어 뜻은 곧 채워져요'}</p>}
                {picked?.line === i && (
                  <div className="read-pick" role="status">
                    <b lang={htmlLang}>{picked.text}</b>
                    {picked.reading && <span className="read-pick-reading">{picked.reading}</span>}
                    <span className="read-pick-ko">{picked.meaning === undefined ? '뜻 찾는 중…' : (picked.meaning ?? '뜻을 찾지 못했어요')}</span>
                    <span className="read-pick-actions">
                      <button type="button" className="btn btn-sub" onClick={() => void speak(picked.text, voice)}>
                        🔊 듣기
                      </button>
                      <button type="button" className="btn btn-sub" aria-pressed={saved.has(pickedId)} onClick={() => void saveWord(picked)}>
                        {saved.has(pickedId) ? '★ 담음' : '☆ 단어장에 담기'}
                      </button>
                      <button type="button" className="btn btn-sub" aria-label="닫기" onClick={() => setPicked(null)}>
                        ×
                      </button>
                    </span>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
        <footer className="read-foot">
          {deviceKo && <p className="read-note">일부 뜻은 이 브라우저의 번역기로 채웠어요.</p>}
          <a className="btn" href={href({ name: 'words', lang: mat.lang })}>
            담은 단어 복습하기
          </a>
          <a className="btn" href={href({ name: 'materials', lang: mat.lang, tab: 'news' })}>
            다른 기사
          </a>
        </footer>
      </main>
    </div>
  )
}
