/** 오늘의 뉴스 탭: 태그로 고르고, 기사 제목과 첫 문장들을 한 줄씩 친다. 원문은 링크로. */
import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { Phrases, Sentences, StatusNotice } from '../../components/components'
import { LANG_NAME, type Lang } from '../../engine/lang'
import { getNews, noticeFor, type NewsArticle, type NewsTag } from '../../services/api'
import { levelOf, NEWS_TAG_NAME, NEWS_TAG_ORDER as ORDER, openNews } from '../../services/news'

export default function NewsTab({ lang }: { lang: Lang }) {
  const { store } = useApp()
  const [list, setList] = useState<NewsArticle[] | null>(null)
  const [tag, setTag] = useState<NewsTag | null>(null)
  const [notice, setNotice] = useState<{ title: string; body: string } | null>(null)
  const [busy, setBusy] = useState('')
  useEffect(() => {
    let alive = true
    getNews(lang).then(
      (r) => alive && setList(r.articles),
      (e) => {
        if (!alive) return
        setList([])
        setNotice(noticeFor(e, lang))
      },
    )
    return () => {
      alive = false
    }
  }, [lang])

  async function open(a: NewsArticle) {
    setBusy('기사를 준비하고 있어요…')
    try {
      const m = await openNews(store, lang, a)
      location.hash = href({ name: 'study', materialId: m.id })
    } finally {
      setBusy('')
    }
  }

  if (!list) return <p className="busy">오늘의 {LANG_NAME[lang].ko} 뉴스를 불러오고 있어요…</p>
  const tags = ORDER.filter((t) => list.some((a) => a.tag === t))
  const shown = tag ? list.filter((a) => a.tag === tag) : list
  const htmlLang = LANG_NAME[lang].htmlLang
  return (
    <div className="news-tab">
      <p className="materials-lead">
        <Sentences text={`매일 아침 새로 나오는 ${LANG_NAME[lang].ko} 뉴스예요. 제목과 첫 문장을 한 줄씩 치고, 원문은 링크로 읽어요.`} />
      </p>
      {notice && <StatusNotice title={notice.title}>{notice.body}</StatusNotice>}
      {tags.length > 0 && (
        <div className="yt-tags" role="group" aria-label="뉴스 분야">
          <button type="button" className="chip-btn" aria-pressed={!tag} onClick={() => setTag(null)}>
            전체 {list.length}
          </button>
          {tags.map((t) => (
            <button key={t} type="button" className="chip-btn" aria-pressed={tag === t} onClick={() => setTag(t)}>
              {NEWS_TAG_NAME[t]} {list.filter((a) => a.tag === t).length}
            </button>
          ))}
        </div>
      )}
      {busy && (
        <p className="busy" aria-live="polite">
          {busy}
        </p>
      )}
      <ul className="news-list">
        {shown.map((a) => (
          <li key={a.id} className="news-card">
            <button type="button" className="news-open" onClick={() => void open(a)} disabled={!!busy}>
              <b className="news-title" lang={htmlLang}>
                <Phrases text={a.title} lang={htmlLang} />
              </b>
              {a.lines[0]?.ko && <span className="news-ko">{a.lines[0].ko}</span>}
              <span className="news-meta">
                {NEWS_TAG_NAME[a.tag]} · {levelOf(a)} · {a.lines.length}줄 · {a.source}
                {!a.lines.some((l) => l.ko) && ' · 한국어 뜻 준비 중'}
              </span>
            </button>
            {a.link && (
              <a className="news-link" href={a.link} target="_blank" rel="noopener noreferrer" aria-label={`${a.title} 원문 기사`}>
                원문
              </a>
            )}
          </li>
        ))}
      </ul>
      {!list.length && !notice && <p className="busy">오늘 뉴스를 아직 못 받았어요. 잠시 뒤 다시 와 주세요.</p>}
    </div>
  )
}
