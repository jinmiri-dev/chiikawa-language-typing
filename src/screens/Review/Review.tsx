import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader } from '../../components/components'
import { editLine, mergeUp, removeLines, restoreRemoved, shiftKo, splitAt, type Segmenter } from '../../engine/import/edit'
import { LANG_NAME } from '../../engine/lang'
import type { Line, Material } from '../../engine/types'
import { loadSegmenter } from '../../services/segmenter'
import { readingOf } from './readingOf'
import './Review.css'

const fmt = (s?: number) => (s === undefined ? '' : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`)

function warnings(l: Line): string[] {
  const w: string[] = []
  if (l.needsCheck?.includes('reading')) w.push('읽기를 확인해 주세요. 눌러서 고칠 수 있어요.')
  if (l.needsCheck?.includes('ko')) w.push('뜻이 없어요. 비워 두면 뜻 없이 연습해요.')
  if (/NETFLIX|ネットフリックス|字幕|翻訳|제작|자막|번역/i.test(l.src)) w.push('제목이나 자막 정보 같아요. 연습할 줄이 아니면 지워 주세요.')
  return w
}

/** 칸을 눌러 그 자리에서 고친다 */
function Cell({ value, label, lang, onSave }: { value: string; label: string; lang?: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  if (editing)
    return (
      <input
        className="cell-input"
        aria-label={label}
        lang={lang}
        defaultValue={value}
        autoFocus
        onBlur={(e) => {
          setEditing(false)
          if (e.target.value !== value) onSave(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  return (
    <button type="button" className="cell" aria-label={`${label} 고치기: ${value || '비어 있음'}`} lang={lang} onClick={() => setEditing(true)}>
      {value || <span className="cell-empty">비어 있음</span>}
    </button>
  )
}

export default function Review({ materialId }: { materialId: string }) {
  const { store } = useApp()
  const [m, setM] = useState<Material | null | undefined>(undefined)
  const [segmenter, setSegmenter] = useState<Segmenter | null>(null)
  const [onlyCheck, setOnlyCheck] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [splitting, setSplitting] = useState<number | null>(null)

  useEffect(() => {
    void store.getMaterial(materialId).then((mat) => {
      setM(mat)
      if (mat) void loadSegmenter(mat.lang).then((s) => setSegmenter(() => s), () => setSegmenter(null))
    })
  }, [store, materialId])

  const seg: Segmenter = useMemo(
    () => (src) => {
      try {
        if (segmenter) return segmenter(src)
      } catch {
        /* 아래로 */
      }
      return [{ text: src, reading: src, isWord: true, confident: false }]
    },
    [segmenter],
  )

  if (m === undefined) return null
  if (!m)
    return (
      <main className="app">
        <section className="center">
          <h1>대본을 찾을 수 없어요</h1>
          <a className="link" href="#/">
            처음으로
          </a>
        </section>
      </main>
    )

  const material = m
  const lang = LANG_NAME[material.lang].htmlLang
  const check = material.lines.filter((l) => l.needsCheck?.length).length
  const shown = material.lines.map((l, i) => ({ l, i })).filter(({ l }) => !onlyCheck || l.needsCheck?.length)
  const one = selected.length === 1 ? selected[0] : null

  function update(lines: Line[]) {
    const next = { ...material, lines }
    setM(next)
    setSelected([])
    setSplitting(null)
    void store.saveMaterial(next)
  }
  const toggle = (i: number) => setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i].sort((a, b) => a - b)))

  return (
    <div className="page">
      <AppHeader back={href({ name: 'materials', lang: material.lang, tab: 'script' })} />
      <main className="review">
        <h1>
          {material.lines.length}줄로 나눴어요 · {check ? `${check}줄만 확인하면 바로 연습할 수 있어요` : '바로 연습할 수 있어요'}
        </h1>
        <p className="page-lead">
          {material.title} · 칸을 누르면 고칠 수 있어요. 줄을 고르면 아래에 합치기·나누기·뜻 밀기가 나와요.
        </p>
        <div role="radiogroup" aria-label="보기" className="review-filter">
          <button type="button" role="radio" aria-checked={!onlyCheck} className="btn btn-sub" onClick={() => setOnlyCheck(false)}>
            전체 {material.lines.length}
          </button>
          <button type="button" role="radio" aria-checked={onlyCheck} className="btn btn-sub" onClick={() => setOnlyCheck(true)}>
            확인 필요 {check}
          </button>
        </div>

        <div className="review-table" role="table" aria-label="나눈 줄">
          <div className="review-row review-head" role="row">
            <span role="columnheader">선택</span>
            <span role="columnheader">번호</span>
            <span role="columnheader">시간</span>
            <span role="columnheader">원문</span>
            <span role="columnheader">읽기</span>
            <span role="columnheader">뜻</span>
          </div>
          {shown.map(({ l, i }) => (
            <div key={l.id} className="review-row" role="row" data-selected={selected.includes(i) || undefined}>
              <span role="cell">
                <input type="checkbox" className="row-check" aria-label={`${i + 1}번 줄 고르기`} checked={selected.includes(i)} onChange={() => toggle(i)} />
              </span>
              <span role="cell" className="row-no">
                {i + 1}
              </span>
              <span role="cell" className="row-time">
                {fmt(l.start)}
              </span>
              <span role="cell" className="row-src">
                {splitting === i ? (
                  <span className="split-pick" lang={lang}>
                    {[...l.src].map((ch, k) => (
                      <span key={k}>
                        {k > 0 && (
                          <button type="button" className="split-gap" aria-label={`${k}번째 글자 앞에서 나누기`} onClick={() => update(splitAt(material.lines, i, k, seg))}>
                            |
                          </button>
                        )}
                        {ch}
                      </span>
                    ))}
                  </span>
                ) : (
                  <Cell value={l.src} label="원문" lang={lang} onSave={(v) => update(editLine(material.lines, i, { src: v }, seg))} />
                )}
                {l.removed?.map((tag) => (
                  <button key={tag} type="button" className="chip removed" onClick={() => update(material.lines.map((x, k) => (k === i ? restoreRemoved(x, tag, seg) : x)))}>
                    {tag} 되살리기
                  </button>
                ))}
              </span>
              <span role="cell" className="row-reading">
                <Cell value={readingOf(material.lang, l)} label="읽기" lang={lang} onSave={(v) => update(editLine(material.lines, i, { reading: v }, seg))} />
              </span>
              <span role="cell" className="row-ko">
                <Cell value={l.ko ?? ''} label="뜻" onSave={(v) => update(editLine(material.lines, i, { ko: v }, seg))} />
              </span>
              {warnings(l).map((w) => (
                <p key={w} className="row-warn" role="note">
                  ⚠ {w}
                </p>
              ))}
            </div>
          ))}
        </div>

        <div className="review-tools" role="toolbar" aria-label="고른 줄 도구" data-active={selected.length > 0 || undefined}>
          <span className="tools-count">{selected.length ? `${selected.length}줄 골랐어요` : '줄을 고르면 도구가 켜져요'}</span>
          <button type="button" className="btn btn-sub" disabled={one === null || one === 0} onClick={() => update(mergeUp(material.lines, one!, seg))}>
            위 줄과 합치기
          </button>
          <button type="button" className="btn btn-sub" disabled={one === null} onClick={() => setSplitting(one)}>
            둘로 나누기
          </button>
          <button type="button" className="btn btn-sub" disabled={!selected.length} onClick={() => update(shiftKo(material.lines, selected[0], -1))}>
            뜻 위로
          </button>
          <button type="button" className="btn btn-sub" disabled={!selected.length} onClick={() => update(shiftKo(material.lines, selected[0], 1))}>
            뜻 아래로
          </button>
          <button type="button" className="btn btn-sub danger" disabled={!selected.length} onClick={() => update(removeLines(material.lines, selected))}>
            지우기
          </button>
          <a className="btn btn-primary" href={href({ name: 'study', materialId: material.id })} aria-disabled={!material.lines.length}>
            연습 시작
          </a>
        </div>
      </main>
    </div>
  )
}
