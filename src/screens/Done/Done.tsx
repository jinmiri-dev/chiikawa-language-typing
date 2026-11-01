import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader } from '../../components/components'
import { FRIEND_INFO, pickLine } from '../../content/friendLines'
import { starterMaterial } from '../../content/starter'
import { eul } from '../../engine/josa'
import { avgLineMs, compareText } from '../../engine/stats/compare'
import { FRIENDS, type Progress } from '../../engine/types'
import '../pages.css'

const BASE = import.meta.env.BASE_URL

export default function Done({ materialId }: { materialId: string }) {
  const { store, settings } = useApp()
  const m = starterMaterial(materialId)
  const [p, setP] = useState<Progress | null | undefined>(undefined)
  const [others, setOthers] = useState<Progress[]>([])
  const [cardOk, setCardOk] = useState(true)
  const [cheer] = useState(() => pickLine(settings.friend, 'finish'))
  useEffect(() => {
    void store.getProgress(materialId).then(setP)
    if (m) void store.listProgress(m.lang).then(setOthers)
  }, [store, materialId, m])
  if (!m || p === undefined) return null
  if (!p || p.results.length === 0)
    return (
      <main className="app">
        <section className="center">
          <h1>아직 친 기록이 없어요</h1>
          <a className="link" href={href({ name: 'study', materialId })}>
            연습하러 가기
          </a>
        </section>
      </main>
    )

  const now = avgLineMs(p.results)
  // 같은 재료 지난 회차가 있으면 그것과, 없으면 같은 언어의 다른 재료 중 최근 것과 비교
  const other = others.filter((o) => o.materialId !== materialId && o.results.length).sort((a, b) => b.updatedAt - a.updatedAt)[0]
  const prev = p.prevAvgMs ?? (other ? avgLineMs(other.results) : null)
  const accuracy = Math.round((p.results.reduce((a, r) => a + r.firstTryAccuracy, 0) / p.results.length) * 100)
  const wrong = m.lines.filter((l) => p.results.find((r) => r.lineId === l.id && r.mistakes > 0))
  const nn = String(FRIENDS.indexOf(p.friend) + 1).padStart(2, '0')
  const card = `${BASE}cards/${nn}-${p.friend}.png`
  const name = FRIEND_INFO[p.friend].name

  return (
    <div className="page">
      <AppHeader back={href({ name: 'materials', lang: m.lang, tab: 'starter' })} />
      <main className="done">
        <h1>언어 1급 따냈어요!</h1>
        <p className="done-sub">
          일본어 · 기본 연습 · {m.title}
          {eul(m.title)} 끝까지 쳤어요.
        </p>
        <div className="done-card">
          {cardOk ? (
            <img src={card} alt={`${name}와 함께 받은 일본어 1급 카드`} onError={() => setCardOk(false)} />
          ) : (
            <div className="done-card-fallback" role="img" aria-label={`${name}와 함께 받은 일본어 1급 카드`}>
              <span>일본어</span>
              <b>1급</b>
              <span>{name}와 함께</span>
            </div>
          )}
        </div>
        {/* 완료 화면의 축하는 사라지지 않는다 */}
        <p className="bubble" aria-live="polite">
          <b>{cheer.text}</b>
          {cheer.action && <span className="bubble-action">{cheer.action}</span>}
        </p>
        <dl className="done-stats">
          <div>
            <dt>완료한 줄</dt>
            <dd>{p.results.length}줄</dd>
          </div>
          <div>
            <dt>처음 친 글자 정확도</dt>
            <dd>{accuracy}%</dd>
          </div>
          <div>
            <dt>연습 시간</dt>
            <dd>{Math.max(1, Math.round(p.activeMs / 60000))}분</dd>
          </div>
        </dl>
        <p className="done-compare">{compareText(prev, now)}</p>
        {wrong.length > 0 && (
          <section className="done-wrong" aria-label="틀렸던 줄">
            <h2>틀렸던 줄 {wrong.length}개</h2>
            <ul>
              {wrong.map((l) => (
                <li key={l.id}>
                  <span lang="ja">{l.src}</span> <span className="done-ko">{l.ko}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="done-actions">
          {cardOk && (
            <a className="btn btn-primary" href={card} download={`언어1급-일본어-${p.friend}.png`}>
              카드 이미지 저장
            </a>
          )}
          <a className="btn" href={href({ name: 'study', materialId })}>
            처음부터 다시
          </a>
          <a className="btn" href={href({ name: 'materials', lang: m.lang, tab: 'starter' })}>
            다른 재료
          </a>
        </div>
      </main>
    </div>
  )
}
