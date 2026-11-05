/**
 * 따라 쓰기 학습지(#/learn/<모국어>/sheet): 저장한 문장을 원고지 칸에.
 * 문장마다 진한 줄(보기) → 연한 줄(따라 쓰기) → 빈 줄(혼자 쓰기), 아래에 발음과 모국어 뜻. A4 로 인쇄한다.
 */
import { useEffect, useState } from 'react'
import { useApp } from '../app/AppState'
import { href } from '../app/routes'
import { AppHeader } from '../components/components'
import type { Lang } from '../engine/lang'
import { romanize } from './hangul'
import { LEARN_TEXT } from './i18n'
import { getLyrics } from '../services/api'
import { listSentences, removeSentence, saveSentences, type SavedSentence } from './learnStore'
import { sheetRows } from './sheet'
import './learn.css'

/** A4 한 줄 칸 수(칸 약 15mm) */
const COLS = 12

export default function LearnSheet({ native }: { native: Lang }) {
  const { store } = useApp()
  const t = LEARN_TEXT[native]
  const [list, setList] = useState<SavedSentence[] | null>(null)
  useEffect(() => {
    let alive = true
    void (async () => {
      const all = await listSentences(store)
      if (!alive) return
      setList(all)
      // 이 모국어 뜻이 없는 문장은 그 영상의 가사(모국어 뜻)를 받아 채운다(서버에 저장돼 있어 빠르다)
      const missing = [...new Set(all.filter((s) => !s.meanings?.[native]).map((s) => s.videoId))]
      if (!missing.length) return
      const filled = all.map((s) => ({ ...s, meanings: { ...s.meanings } }))
      for (const v of missing) {
        const lyrics = await getLyrics(native, v).catch(() => null)
        if (!lyrics) continue
        for (const s of filled.filter((x) => x.videoId === v && !x.meanings[native])) {
          const line = lyrics.lines.find((l) => Math.abs(l.start - s.start) < 0.6)
          if (line?.meaning) s.meanings[native] = line.meaning
        }
      }
      if (!alive) return
      setList(filled)
      await saveSentences(store, filled)
    })()
    return () => {
      alive = false
    }
  }, [store, native])

  return (
    <div className="page learn-sheet-page" lang={t.htmlLang}>
      <div className="no-print">
        <AppHeader back={href({ name: 'learn-list', native })} title={<span className="logo-sub">{t.worksheet}</span>} right={<span />} />
      </div>
      <main className="learn-sheet-main">
        <div className="learn-sheet-tools no-print">
          <h1>{t.savedTitle}</h1>
          {/* 저장한 문장이 없으면 인쇄 버튼 대신 영상으로 가는 길만 */}
          {!!list?.length && (
            <button type="button" className="btn btn-primary" onClick={() => window.print()}>
              {t.print}
            </button>
          )}
        </div>
        {list && !list.length ? (
          <>
            <p className="page-lead">{t.savedEmpty}</p>
            <a className="btn btn-sub learn-back" href={href({ name: 'learn-list', native })}>
              ← {t.title}
            </a>
          </>
        ) : (
          <article className="ws">
            <header className="ws-head">
              <b className="ws-title">
                한글 · {t.sheet.heading}
              </b>
              <span className="ws-fields">
                <span>
                  {t.sheet.date} <i /> {t.sheet.month} <i /> {t.sheet.day}
                </span>
                <span>
                  {t.sheet.name} <i className="ws-name" />
                </span>
              </span>
            </header>
            <p className="ws-guide">{t.sheet.guide}</p>
            {list?.map((s) => (
              <section key={s.id} className="ws-item">
                {/* 배우는 사람 말로 된 뜻을 먼저, 크게 */}
                <p className="ws-meaning">
                  <b>{s.meanings?.[native] ?? ''}</b>
                  <span lang="ko-Latn">{romanize(s.ko)}</span>
                  <button type="button" className="learn-x no-print" aria-label={t.remove} onClick={() => void removeSentence(store, s.id).then(() => setList((l) => l?.filter((x) => x.id !== s.id) ?? null))}>
                    ×
                  </button>
                </p>
                {sheetRows(s.ko, COLS).map((row, r) => (
                  <div key={r} className="ws-block">
                    <div className="ws-row ws-model" lang="ko">
                      {row.map((ch, c) => (
                        <span key={c}>{ch}</span>
                      ))}
                    </div>
                    <div className="ws-row ws-trace" lang="ko" aria-hidden="true">
                      {row.map((ch, c) => (
                        <span key={c}>{ch}</span>
                      ))}
                    </div>
                    <div className="ws-row ws-empty" aria-hidden="true">
                      {row.map((_, c) => (
                        <span key={c} />
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </article>
        )}
      </main>
    </div>
  )
}
