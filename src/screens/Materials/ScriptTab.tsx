import { useEffect, useState } from 'react'
import { useApp } from '../../app/AppState'
import { href } from '../../app/routes'
import { StatusNotice } from '../../components/components'
import { NETFLIX_PICKS, netflixSearch } from '../../content/netflixPicks'
import { buildDraftMaterial } from '../../engine/import/material'
import { parseScript } from '../../engine/import/parse'
import { LANG_NAME, type Lang } from '../../engine/lang'
import type { Material } from '../../engine/types'
import { pairTexts, readScriptFile, titleFrom, youtubeIdFrom } from '../../services/files'
import { loadJaTokenizer } from '../../services/jaTokenizer'
import { newScriptId } from '../../services/materials'

const ACCEPT = '.txt,.srt,.vtt,.csv,.tsv,.pdf,text/plain,application/pdf'

function NetflixPanel({ lang }: { lang: Lang }) {
  const picks = NETFLIX_PICKS[lang] ?? []
  return (
    <aside className="netflix" aria-label="넷플릭스 추천">
      <h2>{LANG_NAME[lang].ko}로 볼 만한 넷플릭스 작품</h2>
      {picks.length ? (
        <ul className="netflix-list">
          {picks.map((p) => (
            <li key={p.title}>
              <a className="netflix-card" href={netflixSearch(p.title)} target="_blank" rel="noopener noreferrer">
                <b>{p.title}</b>
                <span lang={LANG_NAME[lang].htmlLang}>{p.original}</span>
                <span className="netflix-meta">
                  {p.year} · {p.type}
                </span>
                <span className="chip">{p.note}</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="page-lead">추천 작품을 고르고 있어요.</p>
      )}
      <p className="netflix-note">
        직접 고른 작품이에요. 한국 넷플릭스에서 내려갔을 수 있어요. 이중 자막 대본 받는 법은 <a href="#/guide">이용 안내</a>에 있어요.
      </p>
    </aside>
  )
}

export default function ScriptTab({ lang }: { lang: Lang }) {
  const { store } = useApp()
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState('')
  const [yt, setYt] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState<Material[]>([])
  useEffect(() => {
    void store.listMaterials(lang).then((list) => setSaved(list.filter((m) => m.kind === 'script')))
  }, [store, lang])

  async function split() {
    setError('')
    try {
      setBusy('대본을 읽고 있어요…')
      const texts = files.length ? await Promise.all(files.slice(0, 2).map(readScriptFile)) : [text]
      const { text: src, koText } = pairTexts(texts, lang)
      const parsed = parseScript(src, lang, { koText })
      if (!parsed.lines.length) {
        setError('대본에서 줄을 찾지 못했어요. 한 줄에 한 문장씩 붙여 넣어 보세요.')
        return
      }
      setBusy('일본어 사전을 불러오고 있어요. 처음 한 번만 조금 걸려요(약 17MB).')
      const tokenize = await loadJaTokenizer().catch(() => null)
      const m = buildDraftMaterial({
        id: newScriptId(lang),
        lang,
        title: title.trim() || titleFrom({ fileName: files[0]?.name, text: src }),
        lines: parsed.lines,
        tokenize,
        youtubeId: youtubeIdFrom(yt),
      })
      await store.saveMaterial(m)
      location.hash = href({ name: 'review', materialId: m.id })
    } catch {
      setError('대본을 읽지 못했어요. 파일 형식을 확인하거나 글을 붙여 넣어 보세요.')
    } finally {
      setBusy('')
    }
  }

  async function remove(id: string) {
    await store.deleteMaterial(id)
    setSaved((s) => s.filter((m) => m.id !== id))
  }

  return (
    <div className="script-tab">
      <section className="script-input">
        <p className="materials-lead">넷플릭스 이중 자막 대본이나 내 대본을 넣으면 한 줄씩 나눠 드려요. 형식은 자동으로 알아봐요.</p>
        <textarea
          className="script-paste"
          aria-label="대본 붙여넣기"
          lang={LANG_NAME[lang].htmlLang}
          placeholder={'예)\nおはよう！ 좋은 아침!\n元気？ 잘 지내?'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!files.length}
        />
        <div className="script-files">
          <label className="btn btn-sub">
            파일 올리기
            <input type="file" accept={ACCEPT} multiple hidden onChange={(e) => setFiles([...(e.target.files ?? [])])} />
          </label>
          <span className="script-files-note">
            {files.length ? files.map((f) => f.name).join(', ') : 'txt·srt·vtt·csv·pdf, 원문과 한국어 SRT 두 개도 돼요'}
          </span>
          {files.length > 0 && (
            <button type="button" className="btn btn-sub" onClick={() => setFiles([])}>
              파일 빼기
            </button>
          )}
        </div>
        <label className="field">
          <span>제목 (비우면 파일 이름이나 첫 줄)</span>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>유튜브 링크 (있으면)</span>
          <input className="field-input" inputMode="url" value={yt} onChange={(e) => setYt(e.target.value)} placeholder="https://youtu.be/…" />
        </label>
        {error && <StatusNotice title={error} tone="warn" />}
        {busy && <p className="busy" aria-live="polite">{busy}</p>}
        <button type="button" className="btn btn-primary" disabled={!!busy || (!text.trim() && !files.length)} onClick={() => void split()}>
          나누기
        </button>

        {saved.length > 0 && (
          <section className="saved-scripts" aria-label="넣어 둔 대본">
            <h2>넣어 둔 대본</h2>
            <ul>
              {saved.map((m) => (
                <li key={m.id}>
                  <a href={href({ name: 'study', materialId: m.id })}>
                    <b>{m.title}</b> <span>{m.lines.length}줄</span>
                  </a>
                  <a className="btn btn-sub" href={href({ name: 'review', materialId: m.id })}>
                    정리
                  </a>
                  <button type="button" className="btn btn-sub" onClick={() => void remove(m.id)} aria-label={`${m.title} 지우기`}>
                    지우기
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </section>
      <NetflixPanel lang={lang} />
    </div>
  )
}
