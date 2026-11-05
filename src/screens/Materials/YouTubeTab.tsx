import { useEffect, useState, type FormEvent } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { StatusNotice, Sentences } from '../../components/components'
import { CERTS } from '../../content/certs'
import { PICK_KIND_NAME, PICK_KINDS, pickThumb, YOUTUBE_PICKS } from '../../content/youtubePicks'
import { LANG_NAME, type Lang } from '../../engine/lang'
import type { SavedVideo } from '../../engine/types'
import { ApiFailure, noticeFor, searchVideos, workerOrigin, type VideoItem } from '../../services/api'
import { youtubeIdFrom } from '../../services/files'
import { openVideo } from '../../services/youtube'

/** 태그 (기획안 7.4). 검색어는 중계 함수가 언어마다 정한다 */
const TAGS: [string, string][] = [
  ['song', '노래'], ['kids', '동요'], ['drama', '드라마'], ['movie', '영화'], ['variety', '예능'], ['news', '뉴스'], ['vlog', '일상·브이로그'],
]

const time = (sec: number) => {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = String(sec % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}
const toSaved = (lang: Lang, v: VideoItem): SavedVideo => ({
  id: `${lang}:${v.videoId}`, lang, videoId: v.videoId, title: v.title, channel: v.channel, thumbnail: v.thumbnail, durationSec: v.durationSec, savedAt: Date.now(),
})

/** 유튜브 탭 (와이어프레임 02-B): 입력 하나(검색어 또는 링크), 태그, 저장한 영상, 결과 카드 */
export default function YouTubeTab({ lang }: { lang: Lang }) {
  const { store } = useApp()
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<VideoItem[]>([])
  const [saved, setSaved] = useState<SavedVideo[]>([])
  // 처음에는 자막을 확인해 둔 추천 영상(검색 한도를 쓰지 않는다)
  const [view, setView] = useState<'picks' | 'results' | 'saved'>('picks')
  const [busy, setBusy] = useState('')
  // 자격증 태그: 펼치면 시험·급수 버튼이 나온다(그 언어 시험이 있을 때만)
  const certs = CERTS[lang] ?? []
  const [certOpen, setCertOpen] = useState(false)
  const [certPicked, setCertPicked] = useState('')
  const [notice, setNotice] = useState(() => (workerOrigin() ? null : noticeFor(new ApiFailure('NOT_CONNECTED', ''), lang)))
  useEffect(() => {
    void store.listSaved(lang).then(setSaved)
  }, [store, lang])

  async function run(p: { q?: string; tag?: string }) {
    setNotice(null)
    setView('results')
    setBusy('찾고 있어요…')
    try {
      setItems((await searchVideos(lang, p)).items)
    } catch (e) {
      setNotice(noticeFor(e, lang))
    } finally {
      setBusy('')
    }
  }

  async function open(videoId: string, meta?: VideoItem) {
    setNotice(null)
    setBusy('자막을 가져오고 있어요…')
    try {
      const m = await openVideo(store, lang, videoId, meta && { title: meta.title, channel: meta.channel, durationSec: meta.durationSec, thumbnail: meta.thumbnail })
      location.hash = href({ name: 'study', materialId: m.id })
    } catch (e) {
      setNotice(noticeFor(e, lang))
    } finally {
      setBusy('')
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    const id = youtubeIdFrom(q)
    if (id) void open(id)
    else void run({ q })
  }

  async function toggleSave(v: VideoItem) {
    const id = `${lang}:${v.videoId}`
    if (saved.some((s) => s.id === id)) {
      await store.deleteSaved(id)
      setSaved((s) => s.filter((x) => x.id !== id))
    } else {
      const sv = toSaved(lang, v)
      await store.saveVideo(sv)
      setSaved((s) => [sv, ...s])
    }
  }

  const picks = YOUTUBE_PICKS[lang].map((p) => ({ ...p, thumbnail: pickThumb(p.videoId), embeddable: true }))
  const shown: VideoItem[] = view === 'saved' ? saved.map((s) => ({ ...s, embeddable: true })) : view === 'picks' ? picks : items
  function card(v: VideoItem) {
    const isSaved = saved.some((s) => s.videoId === v.videoId)
    return (
      <li key={v.videoId} className="yt-card">
        <button type="button" className="yt-open" onClick={() => void open(v.videoId, v)} disabled={!!busy}>
          <span className="yt-thumb">
            <img src={v.thumbnail} alt="" loading="lazy" />
            {v.durationSec > 0 && <span className="yt-time">{time(v.durationSec)}</span>}
          </span>
          <b className="yt-title">{v.title}</b>
          <span className="yt-channel">{v.channel}</span>
        </button>
        <button type="button" className="yt-save" aria-pressed={isSaved} aria-label={`${v.title} ${isSaved ? '저장 취소' : '저장'}`} onClick={() => void toggleSave(v)}>
          {isSaved ? '★ 저장됨' : '☆ 저장'}
        </button>
      </li>
    )
  }

  return (
    <div className="yt-tab">
      <form className="yt-search" role="search" onSubmit={submit}>
        <input
          className="field-input yt-input"
          aria-label="검색어나 유튜브 링크"
          placeholder={`${LANG_NAME[lang].ko} 영상 검색 또는 유튜브 링크 붙여넣기`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          lang={LANG_NAME[lang].htmlLang}
        />
        <button type="submit" className="btn btn-primary">
          찾기
        </button>
      </form>
      <div className="yt-tags" role="group" aria-label="태그">
        <button type="button" className="chip-btn" aria-pressed={view === 'picks'} onClick={() => setView('picks')}>
          추천
        </button>
        <button type="button" className="chip-btn" aria-pressed={view === 'saved'} onClick={() => setView('saved')}>
          저장한 영상 {saved.length}
        </button>
        {certs.length > 0 && (
          <button type="button" className="chip-btn" aria-expanded={certOpen} aria-pressed={certOpen} onClick={() => setCertOpen((v) => !v)}>
            자격증
          </button>
        )}
        {TAGS.map(([id, label]) => (
          <button key={id} type="button" className="chip-btn" onClick={() => void run({ tag: id })}>
            {label}
          </button>
        ))}
      </div>
      {certOpen && (
        <div className="yt-certs" role="group" aria-label="자격증 급수">
          {certs.map((c) => (
            <div key={c.name} className="yt-cert">
              <b>{c.name}</b>
              {c.levels.map((lv) => {
                const id = `${c.name} ${lv.label}`
                return (
                  <button
                    key={id}
                    type="button"
                    className="chip-btn"
                    aria-label={id}
                    aria-pressed={certPicked === id}
                    onClick={() => {
                      setCertPicked(id)
                      void run({ q: lv.q })
                    }}
                  >
                    {lv.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      )}
      {notice && <StatusNotice title={notice.title} tone="warn">{notice.body}</StatusNotice>}
      {busy && <p className="busy" aria-live="polite">{busy}</p>}
      {view === 'picks' && !busy && <p className="page-lead"><Sentences text={`${LANG_NAME[lang].ko} 자막과 한국어 뜻이 붙는 걸 확인한 영상이에요. 태그나 검색으로 더 찾을 수 있어요.`} /></p>}
      {view === 'saved' && !saved.length && <p className="page-lead"><Sentences text="마음에 드는 영상의 저장 버튼을 누르면 여기에 모여요. 저장한 영상은 검색 한도를 쓰지 않아요." /></p>}
      {view === 'picks' ? (
        // 추천: 종류별로(동요·노래·명언·뉴스·영화·일상)
        PICK_KINDS.filter((k) => picks.some((p) => p.kind === k)).map((k) => (
          <section key={k} className="yt-pick-group" aria-label={PICK_KIND_NAME[k]}>
            <h3>{PICK_KIND_NAME[k]}</h3>
            <ul className="yt-grid">{picks.filter((p) => p.kind === k).map(card)}</ul>
          </section>
        ))
      ) : (
        <ul className="yt-grid">{shown.map(card)}</ul>
      )}
    </div>
  )
}
