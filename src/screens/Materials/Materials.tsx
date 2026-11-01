import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href, type MaterialTab } from '../../app/routes'
import { AppHeader, StatusNotice } from '../../components/components'
import { starterSets } from '../../content/starter'
import { LANG_NAME, type Lang } from '../../engine/lang'
import type { Progress } from '../../engine/types'
import './Materials.css'

const TABS: { id: MaterialTab; label: string }[] = [
  { id: 'starter', label: '기본 연습' },
  { id: 'youtube', label: '유튜브' },
  { id: 'script', label: '대본' },
]

const SOON = '이 단계에서는 일본어 기본 연습부터 열었어요. 유튜브와 대본, 다른 언어는 곧 열려요.'

export default function Materials({ lang, tab }: { lang: Lang; tab: MaterialTab }) {
  const { store } = useApp()
  const [progress, setProgress] = useState<Record<string, Progress>>({})
  useEffect(() => {
    void store.listProgress(lang).then((list) => setProgress(Object.fromEntries(list.map((p) => [p.materialId, p]))))
  }, [store, lang])

  const sets = starterSets(lang)
  return (
    <div className="page">
      <AppHeader back="#/" />
      <main className="materials">
        <h1>
          <span lang={LANG_NAME[lang].htmlLang}>{LANG_NAME[lang].ko}</span> 무엇으로 연습할까요?
        </h1>
        <div role="tablist" aria-label="재료" className="tabs">
          {TABS.map((t) => (
            <a
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className="tab"
              href={href({ name: 'materials', lang, tab: t.id })}
            >
              {t.label}
            </a>
          ))}
        </div>
        <section role="tabpanel" className="tabpanel">
          {tab === 'starter' && sets.length > 0 ? (
            <>
              <p className="materials-lead">친구와 채팅할 때 바로 쓰는 짧은 말이에요. 세트를 고르면 바로 시작해요.</p>
              <ul className="set-grid">
                {sets.map((s) => {
                  const p = progress[s.id]
                  const done = p ? Math.min(p.lineIndex, s.lines) : 0
                  return (
                    <li key={s.id}>
                      <a className="set-card" href={href({ name: 'study', materialId: s.id })}>
                        <span className="set-title">{s.title}</span>
                        <span className="set-meta">
                          {s.lines}줄 · 약 {s.minutes}분{!s.reviewed && <span className="chip">검수 전</span>}
                        </span>
                        <span className="set-progress">{p ? (done >= s.lines ? '다 쳤어요' : `${done} / ${s.lines}줄`) : '처음'}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <StatusNotice title="곧 열려요">{SOON}</StatusNotice>
          )}
        </section>
      </main>
    </div>
  )
}
