import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { AppHeader, FriendImage, StatusNotice } from '../../components/components'
import { getMaterial } from '../../services/materials'
import { buildReviewMaterial, reviewCount } from '../../services/review'
import { lineSpeedTrend } from '../../engine/stats/trend'
import { KIND_NAME, LANG_NAME, LANGS, type Lang } from '../../engine/lang'
import type { Material, Progress } from '../../engine/types'
import './Home.css'

/** 아이폰·아이패드 사파리이고 홈 화면 앱으로 연 게 아니면 */
function isIosSafari(): boolean {
  const ua = navigator.userAgent
  const standalone = (navigator as Navigator & { standalone?: boolean }).standalone
  return /iP(hone|ad|od)/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua) && !standalone
}

const GLYPH: Record<Lang, string> = { en: 'Aa', ja: 'あ', zh: '你', tw: '妳', mn: 'Ө' }

function LangCards() {
  return (
    <nav aria-label="배울 언어" className="lang-cards">
      {LANGS.map((l) => (
        <a key={l} className="lang-card" href={href({ name: 'materials', lang: l, tab: 'starter' })}>
          <span className="lang-glyph" lang={LANG_NAME[l].htmlLang} aria-hidden="true">
            {GLYPH[l]}
          </span>
          <span className="lang-name">{LANG_NAME[l].ko}</span>
          <span className="lang-native" lang={LANG_NAME[l].htmlLang}>
            {LANG_NAME[l].native}
          </span>
        </a>
      ))}
    </nav>
  )
}

function HowTo() {
  return (
    <aside aria-label="이렇게 연습해요" className="howto">
      <h2>이렇게 연습해요</h2>
      <div className="howto-preview" aria-hidden="true">
        <p lang="ja" className="howto-line">
          <ruby>
            今日<rt>きょう</rt>
          </ruby>
          は
          <mark>
            <ruby>
              何<rt>なに</rt>
            </ruby>
          </mark>
          <span className="howto-rest">する？</span>
        </p>
        <p className="howto-ko">오늘은 뭐 해?</p>
        <p className="howto-keys">
          <b lang="ja">何</b> = <kbd className="now">N</kbd>
          <kbd>A</kbd>
          <kbd>N</kbd>
          <kbd>I</kbd> → 변환
        </p>
      </div>
      <ol className="howto-steps">
        <li>
          <b>대사를 듣고</b> <span>유튜브, 넷플릭스 대본, 기본 문장 중에서</span>
        </li>
        <li>
          <b>따라 쳐요</b> <span>누를 키를 노란색으로 알려 줘요</span>
        </li>
        <li>
          <b>단어를 담아요</b> <span>다 치면 1급 카드도 받아요</span>
        </li>
      </ol>
    </aside>
  )
}

function Continue({ p, m, sub }: { p: Progress; m: Material; sub?: boolean }) {
  const done = Math.min(p.lineIndex, m.lines.length)
  return (
    <a className={sub ? 'continue continue-sub' : 'continue'} href={href({ name: 'study', materialId: p.materialId })}>
      <span className="continue-label">이어서 공부하기</span>
      <span className="continue-title">
        {LANG_NAME[m.lang].ko} · {KIND_NAME[m.kind]} · {m.title}
      </span>
      <span className="continue-progress">
        {done} / {m.lines.length}줄
      </span>
      <span className="continue-bar" aria-hidden="true">
        <span style={{ width: `${(done / m.lines.length) * 100}%` }} />
      </span>
    </a>
  )
}

export default function Home() {
  const { store, settings } = useApp()
  const [last, setLast] = useState<{ p: Progress; m: Material } | null | undefined>(undefined)
  const [due, setDue] = useState(0)
  const [trend, setTrend] = useState<string | null>(null)
  const [safariTip, setSafariTip] = useState(false)
  useEffect(() => {
    void (async () => {
      const p = await store.lastProgress()
      const m = p ? await getMaterial(store, p.materialId) : null
      setDue(await reviewCount(store))
      if (isIosSafari() && !(await store.getMeta('safariTipOff'))) setSafariTip(true)
      if (m) setTrend(lineSpeedTrend(await store.listStats(m.lang), m.lang, Date.now())?.text ?? null)
      setLast(p && m ? { p, m } : null)
    })()
  }, [store])

  async function startReview() {
    const m = await buildReviewMaterial(store)
    if (m) location.hash = href({ name: 'study', materialId: m.id })
  }
  if (last === undefined) return null

  return (
    <div className="page">
      <AppHeader />
      <main className="home">
        <section className="home-main">
          {last ? (
            <>
              <div className="home-friend">
                <FriendImage friend={settings.friend} size={120} />
              </div>
              <h1>다시 왔네요! 오늘도 한 줄씩 쳐 봐요.</h1>
              {due > 0 && (
                <button type="button" className="continue review-start" onClick={() => void startReview()}>
                  <span className="continue-label">오늘의 복습</span>
                  <span className="continue-title">틀렸던 줄과 담은 단어 {due}개 · 약 {Math.max(1, Math.round(due * 0.6))}분</span>
                </button>
              )}
              <Continue p={last.p} m={last.m} sub={due > 0} />
              {trend && <p className="home-trend">{trend}</p>}
              <h2>다른 언어로 시작하기</h2>
            </>
          ) : (
            <>
              <div className="home-trio" aria-hidden="true">
                <FriendImage friend="chiikawa" size={96} />
                <FriendImage friend="hachiware" size={96} />
                <FriendImage friend="usagi" size={96} />
              </div>
              <h1>
                좋아하는 영상 대사를 따라 치며
                <br />
                외국어 타자를 익혀요
              </h1>
              <p className="home-sub">어떤 키를 누르는지 하나하나 알려 줘요. 휴대폰에서도 돼요.</p>
              <h2>배울 언어를 누르면 바로 시작해요</h2>
            </>
          )}
          <LangCards />
          <p className="home-note">로그인 없이 바로 써요. 기록은 이 브라우저에만 저장돼요.</p>
          {safariTip && (
            <StatusNotice title="홈 화면에 추가하면 기록이 더 오래 안전해요">
              아이폰 사파리는 7일 동안 안 쓰면 사이트 기록을 지울 수 있어요. 공유 버튼 › 홈 화면에 추가를 눌러 두세요.
              <button
                type="button"
                className="btn btn-sub tip-off"
                onClick={() => {
                  setSafariTip(false)
                  void store.setMeta('safariTipOff', true)
                }}
              >
                다시 보지 않기
              </button>
            </StatusNotice>
          )}
          {!store.persistent && <StatusNotice title="이 브라우저에서는 기록이 저장되지 않아요" tone="warn">사생활 보호 모드에서는 창을 닫으면 진도가 사라져요.</StatusNotice>}
        </section>
        {!last && <HowTo />}
      </main>
      <footer className="home-footer">개발자: 진미리</footer>
    </div>
  )
}
