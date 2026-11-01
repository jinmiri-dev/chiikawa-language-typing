import { useEffect, useState } from 'react'
import { href } from '../../app/routes'
import { NETFLIX_PICKS, netflixSearch } from '../../content/netflixPicks'
import { LANG_NAME, type Lang } from '../../engine/lang'
import { getNetflix, workerOrigin, type NetflixResult } from '../../services/api'

interface Card {
  key: string
  title: string
  original: string
  meta: string
  note: string | null
  poster: string | null
  search: string
}

/** 넷플릭스 추천 (기획안 7.5): 중계 서버가 있으면 TMDB 작품 + 직접 고른 작품, 없으면 직접 고른 작품만 */
export default function NetflixPanel({ lang }: { lang: Lang }) {
  const [tmdb, setTmdb] = useState<NetflixResult | null>(null)
  useEffect(() => {
    if (!workerOrigin()) return
    getNetflix(lang).then(setTmdb, () => setTmdb(null))
  }, [lang])

  const picks: Card[] = (NETFLIX_PICKS[lang] ?? []).map((p) => ({
    key: `p:${p.original}`, title: p.title, original: p.original, meta: `${p.year} · ${p.type}`, note: p.note, poster: null, search: p.search ?? p.title,
  }))
  const found: Card[] = (tmdb?.items ?? []).map((i) => ({
    key: `t:${i.tmdbId}`, title: i.title, original: i.originalTitle, meta: [i.year, i.type === 'tv' ? '드라마' : '영화'].filter(Boolean).join(' · '), note: i.pick, poster: i.poster, search: i.title,
  }))
  // TMDB 결과에 이미 있는 직접 고른 작품은 한 번만
  const cards = [...found, ...picks.filter((p) => !found.some((f) => f.original === p.original))]

  return (
    <aside className="netflix" aria-label="넷플릭스 추천">
      <h2>{LANG_NAME[lang].ko}로 볼 만한 넷플릭스 작품</h2>
      {cards.length ? (
        <ul className="netflix-list">
          {cards.map((c) => (
            <li key={c.key}>
              <a className="netflix-card" href={netflixSearch(c.search)} target="_blank" rel="noopener noreferrer">
                {c.poster && <img className="netflix-poster" src={c.poster} alt="" loading="lazy" />}
                <b>{c.title}</b>
                <span lang={LANG_NAME[lang].htmlLang}>{c.original}</span>
                <span className="netflix-meta">{c.meta}</span>
                {c.note && <span className="chip">{c.note}</span>}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="netflix-none">
          <p className="page-lead">지금 한국 넷플릭스에는 {LANG_NAME[lang].ko} 작품이 거의 없어요. 유튜브에서 {LANG_NAME[lang].ko} 영상을 찾아 연습해 보세요.</p>
          <a className="btn btn-sub" href={href({ name: 'materials', lang, tab: 'youtube' })}>
            유튜브로 찾기
          </a>
        </div>
      )}
      <p className="netflix-note">
        {tmdb ? '' : '직접 고른 작품이에요. '}한국 넷플릭스에서 내려갔을 수 있어요. 이중 자막 대본 받는 법은 <a href="#/guide">이용 안내</a>에 있어요.
      </p>
      {tmdb && <p className="netflix-note">{tmdb.attribution}</p>}
    </aside>
  )
}
